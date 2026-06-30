/**
 * Pure client-side image enhancement engine.
 *
 * Everything here runs in the browser — source images never leave the user's
 * device. The pipeline is:
 *
 *   1. Decode the uploaded file to a bitmap (off-main-thread when supported).
 *   2. Progressively upscale to the target resolution in <=1.8x passes using
 *      high-quality smoothing (reduces interpolation artifacts vs one jump).
 *   3. Separable box-blur based unsharp mask to recover crispness.
 *   4. Contrast / saturation / brightness lift for a punchy, "enhanced" look.
 *
 * The heavy pixel work is sliced into async chunks so the UI thread stays
 * responsive and we can report live progress.
 */

export type Resolution = "2K" | "4K" | "8K";
export type EnhanceFormat = "image/jpeg" | "image/png";

export const RESOLUTION_LONG_EDGE: Record<Resolution, number> = {
  "2K": 2560,
  "4K": 3840,
  "8K": 7680,
};

export type EnhanceOptions = {
  source: CanvasImageSource & { width?: number; height?: number };
  sourceWidth: number;
  sourceHeight: number;
  resolution: Resolution;
  strength: number; // 0..1
  format: EnhanceFormat;
  quality?: number; // jpeg quality 0..1
  signal?: AbortSignal;
  onProgress?: (progress: number, label: string) => void;
};

export type EnhanceResult = {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  url: string;
  blob: Blob;
};

const MAX_DIM = 8192; // safety cap on the long edge (8K)

function yieldToUi(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function makeCanvas(w: number, h: number, willReadFrequently = false) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently });
  if (!ctx) throw new Error("Canvas 2D context unavailable in this browser.");
  return { canvas: c, ctx };
}

function roundEven(n: number) {
  return Math.round(n / 2) * 2;
}

/** Compute output dimensions that fit `longEdge` while preserving aspect ratio. */
export function computeOutput(
  srcW: number,
  srcH: number,
  resolution: Resolution,
): { width: number; height: number } {
  const longEdge = Math.min(MAX_DIM, RESOLUTION_LONG_EDGE[resolution]);
  if (srcW >= srcH) {
    const width = roundEven(longEdge);
    const height = roundEven((longEdge * srcH) / srcW);
    return { width, height };
  }
  const height = roundEven(longEdge);
  const width = roundEven((longEdge * srcW) / srcH);
  return { width, height };
}

/** Decode an uploaded File into a drawable source + natural dimensions. */
export async function decodeFile(
  file: File,
): Promise<{
  source: CanvasImageSource & { width: number; height: number };
  width: number;
  height: number;
}> {
  if (typeof createImageBitmap === "function") {
    try {
      const bmp = await createImageBitmap(file);
      return {
        source: bmp as CanvasImageSource & { width: number; height: number },
        width: bmp.width,
        height: bmp.height,
      };
    } catch {
      // fall through to <img> decoding
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Could not decode image file."));
      el.src = url;
    });
    return {
      source: img as CanvasImageSource & { width: number; height: number },
      width: img.naturalWidth,
      height: img.naturalHeight,
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Progressive upscaling in <=1.8x steps for smoother results. */
function progressiveScale(
  src: CanvasImageSource,
  srcW: number,
  srcH: number,
  targetW: number,
  targetH: number,
  signal: AbortSignal | undefined,
): HTMLCanvasElement {
  let cur: CanvasImageSource = src;
  let curW = srcW;
  let curH = srcH;

  // Downscale or already-correct in a single pass.
  if (curW >= targetW || curH >= targetH) {
    const { canvas, ctx } = makeCanvas(targetW, targetH);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(cur, 0, 0, targetW, targetH);
    return canvas;
  }

  while (curW < targetW || curH < targetH) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const nextW = Math.min(targetW, Math.ceil(curW * 1.8));
    const nextH = Math.min(targetH, Math.ceil(curH * 1.8));
    const { canvas, ctx } = makeCanvas(nextW, nextH);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(cur, 0, 0, nextW, nextH);
    cur = canvas;
    curW = nextW;
    curH = nextH;
  }
  return cur as HTMLCanvasElement;
}

/** Encode a canvas to a Blob (promise wrapper around toBlob). */
export function canvasToBlob(
  canvas: HTMLCanvasElement,
  format: EnhanceFormat,
  quality = 0.95,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(new Error("Failed to encode canvas output.")),
      format,
      quality,
    );
  });
}

/**
 * Run the full enhancement pipeline. `onProgress` receives values 0..1.
 */
export async function enhanceImage(opts: EnhanceOptions): Promise<EnhanceResult> {
  const {
    source,
    sourceWidth,
    sourceHeight,
    resolution,
    strength,
    format,
    quality = 0.95,
    signal,
    onProgress,
  } = opts;

  const { width: outW, height: outH } = computeOutput(
    sourceWidth,
    sourceHeight,
    resolution,
  );

  const report = (p: number, label: string) => onProgress?.(Math.max(0, Math.min(1, p)), label);
  report(0.02, "Decoding");

  // 1. Progressive upscale.
  report(0.08, "Upscaling");
  const scaled = progressiveScale(source, sourceWidth, sourceHeight, outW, outH, signal);
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

  // 2. Set up pixel buffers on a read-friendly canvas.
  const { canvas, ctx } = makeCanvas(outW, outH, true);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(scaled, 0, 0, outW, outH);

  const imageData = ctx.getImageData(0, 0, outW, outH);
  const src = imageData.data; // original -> becomes output (Uint8ClampedArray)
  const blurred = new Uint8ClampedArray(src.length); // horizontal blur accumulator

  // Tuning derived from user-controlled strength.
  const amount = 0.35 + strength * 0.95; // unsharp amount
  const radius = 2; // box-blur radius (separable)
  const contrast = 1.03 + strength * 0.06;
  const saturation = 1.05 + strength * 0.1;
  const brightness = 1.01 + strength * 0.012;

  const w = outW;
  const h = outH;
  const tapCount = radius * 2 + 1;

  // 3a. Horizontal box blur of the upscaled image -> `blurred`.
  await chunked(0, h, signal, (y0, y1) => {
    for (let y = y0; y < y1; y++) {
      const row = y * w * 4;
      for (let x = 0; x < w; x++) {
        let r = 0,
          g = 0,
          b = 0;
        for (let k = -radius; k <= radius; k++) {
          let xx = x + k;
          if (xx < 0) xx = 0;
          else if (xx >= w) xx = w - 1;
          const i = row + xx * 4;
          r += src[i];
          g += src[i + 1];
          b += src[i + 2];
        }
        const o = row + x * 4;
        blurred[o] = (r / tapCount) | 0;
        blurred[o + 1] = (g / tapCount) | 0;
        blurred[o + 2] = (b / tapCount) | 0;
        blurred[o + 3] = src[o + 3];
      }
    }
  }, (done) => report(0.08 + 0.42 * done, "Sharpening"));

  // 3b. Vertical blur (from `blurred`) + unsharp + color -> write `src`.
  await chunked(0, h, signal, (y0, y1) => {
    for (let y = y0; y < y1; y++) {
      for (let x = 0; x < w; x++) {
        let r = 0,
          g = 0,
          b = 0;
        for (let k = -radius; k <= radius; k++) {
          let yy = y + k;
          if (yy < 0) yy = 0;
          else if (yy >= h) yy = h - 1;
          const i = (yy * w + x) * 4;
          r += blurred[i];
          g += blurred[i + 1];
          b += blurred[i + 2];
        }
        r /= tapCount;
        g /= tapCount;
        b /= tapCount;

        const o = (y * w + x) * 4;
        // unsharp mask
        let or = src[o] + amount * (src[o] - r);
        let og = src[o + 1] + amount * (src[o + 1] - g);
        let ob = src[o + 2] + amount * (src[o + 2] - b);

        // brightness
        or *= brightness;
        og *= brightness;
        ob *= brightness;

        // contrast around mid-grey
        or = (or - 128) * contrast + 128;
        og = (og - 128) * contrast + 128;
        ob = (ob - 128) * contrast + 128;

        // saturation toward luminance
        const lum = 0.2126 * or + 0.7152 * og + 0.0722 * ob;
        or = lum + (or - lum) * saturation;
        og = lum + (og - lum) * saturation;
        ob = lum + (ob - lum) * saturation;

        src[o] = or;
        src[o + 1] = og;
        src[o + 2] = ob;
        // alpha untouched
      }
    }
  }, (done) => report(0.5 + 0.45 * done, "Color & detail"));

  ctx.putImageData(imageData, 0, 0);
  report(0.97, "Encoding");

  const blob = await canvasToBlob(canvas, format, quality);
  const url = canvas.toDataURL(format === "image/png" ? "image/png" : "image/jpeg", 0.92);
  report(1, "Done");

  return { canvas, width: outW, height: outH, url, blob };
}

/** Iterate a row range in async batches, yielding to the UI between batches. */
async function chunked(
  from: number,
  to: number,
  signal: AbortSignal | undefined,
  work: (y0: number, y1: number) => void,
  onBatch: (doneFraction: number) => void,
) {
  const total = to - from;
  // Larger batches for big images = less overhead; keep batches small enough
  // for the event loop to paint progress between them.
  const batch = Math.max(8, Math.ceil(total / 120));
  let done = 0;
  for (let y = from; y < to; y += batch) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const y1 = Math.min(to, y + batch);
    work(y, y1);
    done = y1 - from;
    onBatch(done / total);
    await yieldToUi();
  }
}

/** Re-encode an existing canvas to a different format/quality for download. */
export async function reexportCanvas(
  canvas: HTMLCanvasElement,
  format: EnhanceFormat,
  quality = 0.95,
): Promise<Blob> {
  return canvasToBlob(canvas, format, quality);
}
