"use client";

import { useCallback, useRef, useState } from "react";
import {
  decodeFile,
  enhanceImage,
  computeOutput,
  reexportCanvas,
  type Resolution,
  type EnhanceFormat,
  type EnhanceResult,
} from "@/lib/image/enhance";
import {
  UploadIcon,
  SparkleIcon,
  DownloadIcon,
  CheckIcon,
  CloseIcon,
  RefreshIcon,
  ShieldIcon,
} from "@/components/Icons";
import BeforeAfterSlider from "@/components/BeforeAfterSlider";

type Status = "idle" | "processing" | "done" | "error";

const RESOLUTIONS: { id: Resolution; label: string; sub: string }[] = [
  { id: "2K", label: "2K", sub: "Quad HD" },
  { id: "4K", label: "4K", sub: "Ultra HD" },
  { id: "8K", label: "8K", sub: "Ultra+ HD" },
];

function formatBytes(bytes: number) {
  if (!bytes) return "0 KB";
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export default function EnhancerStudio() {
  const [file, setFile] = useState<File | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [originalSize, setOriginalSize] = useState<{ w: number; h: number } | null>(null);
  const [resolution, setResolution] = useState<Resolution>("4K");
  const [strength, setStrength] = useState(0.6);
  const [format, setFormat] = useState<EnhanceFormat>("image/jpeg");
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState(0);
  const [label, setLabel] = useState("");
  const [result, setResult] = useState<EnhanceResult | null>(null);
  const [resultFormat, setResultFormat] = useState<EnhanceFormat>("image/jpeg");
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setFile(null);
    setOriginalUrl(null);
    setOriginalSize(null);
    setResult(null);
    setStatus("idle");
    setProgress(0);
    setError(null);
  }, []);

  const handleFile = useCallback(async (f: File) => {
    if (!f.type.startsWith("image/")) {
      setError("Please choose a valid image file (JPG, PNG, WebP).");
      return;
    }
    if (f.size > 60 * 1024 * 1024) {
      setError("That image is larger than 60 MB. Please pick a smaller file.");
      return;
    }
    setError(null);
    setResult(null);
    setStatus("idle");
    setProgress(0);
    setFile(f);
    const url = URL.createObjectURL(f);
    setOriginalUrl(url);
    try {
      const { width, height } = await decodeFile(f);
      setOriginalSize({ w: width, h: height });
    } catch {
      // Fallback: read dimensions from an <img>
      const img = new Image();
      img.src = url;
      await new Promise((res) => {
        img.onload = res;
        img.onerror = res;
      });
      setOriginalSize({ w: img.naturalWidth, h: img.naturalHeight });
    }
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const f = e.dataTransfer.files?.[0];
      if (f) void handleFile(f);
    },
    [handleFile],
  );

  const runEnhance = useCallback(async () => {
    if (!file || !originalSize) return;
    setStatus("processing");
    setProgress(0);
    setError(null);
    const controller = new AbortController();
    abortRef.current = controller;
    const startedAt = performance.now();
    try {
      const { source, width, height } = await decodeFile(file);
      const res = await enhanceImage({
        source,
        sourceWidth: width,
        sourceHeight: height,
        resolution,
        strength,
        format,
        quality: 0.95,
        signal: controller.signal,
        onProgress: (p, lbl) => {
          setProgress(p);
          setLabel(lbl);
        },
      });
      setResult(res);
      setResultFormat(format);
      setStatus("done");
      const elapsed = ((performance.now() - startedAt) / 1000).toFixed(1);
      setLabel(`Enhanced in ${elapsed}s`);

      // Record anonymous usage stats (best-effort).
      void fetch("/api/enhancements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resolution,
          sourcePixels: width * height,
          outputPixels: res.width * res.height,
        }),
      }).catch(() => {});
      window.dispatchEvent(new Event("enhancement-done"));
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setStatus("idle");
        setProgress(0);
        return;
      }
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Something went wrong while enhancing.",
      );
      setStatus("error");
    }
  }, [file, originalSize, resolution, strength, format]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setStatus("idle");
    setProgress(0);
  }, []);

  const downloadAs = useCallback(
    async (fmt: EnhanceFormat) => {
      if (!result) return;
      try {
        setDownloading(true);
        const blob =
          fmt === resultFormat
            ? result.blob
            : await reexportCanvas(result.canvas, fmt, 0.95);
        const ext = fmt === "image/png" ? "png" : "jpg";
        triggerDownload(blob, `enhanced-${resolution}-${result.width}x${result.height}.${ext}`);
      } catch (err) {
        console.error(err);
        setError("Could not export the image for download.");
      } finally {
        setDownloading(false);
      }
    },
    [result, resultFormat, resolution],
  );

  const out = originalSize
    ? computeOutput(originalSize.w, originalSize.h, resolution)
    : null;
  const scale =
    originalSize && out
      ? ((out.width * out.height) / (originalSize.w * originalSize.h)) || 1
      : 1;

  return (
    <div className="w-full">
      {/* ===== Upload zone ===== */}
      {!originalUrl && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`group relative flex cursor-pointer flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed px-6 py-16 text-center transition ${
            dragging
              ? "border-violet-400 bg-violet-500/10"
              : "border-white/15 bg-white/[0.03] hover:border-white/30 hover:bg-white/[0.05]"
          }`}
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 text-slate-950 shadow-lg shadow-violet-500/30">
            <UploadIcon className="h-8 w-8" />
          </div>
          <div>
            <p className="text-lg font-semibold text-white">
              Drop an image here, or click to browse
            </p>
            <p className="mt-1 text-sm text-slate-400">
              JPG, PNG or WebP · up to 60 MB · processed privately on your device
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
              e.target.value = "";
            }}
          />
        </div>
      )}

      {error && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          <CloseIcon className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* ===== Controls + result ===== */}
      {originalUrl && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          {/* Preview / result */}
          <div className="order-2 lg:order-1">
            {status === "done" && result ? (
              <BeforeAfterSlider
                beforeUrl={originalUrl}
                afterUrl={result.url}
                aspect={result.width / result.height}
              />
            ) : (
              <div className="relative overflow-hidden rounded-2xl ring-1 ring-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={originalUrl}
                  alt="Original upload"
                  className="block w-full"
                  style={{ aspectRatio: originalSize ? String(originalSize.w / originalSize.h) : "16 / 10", objectFit: "cover" }}
                />
                {status === "processing" && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-950/70 backdrop-blur-sm">
                    <div className="flex items-center gap-3 text-white">
                      <span className="relative flex h-6 w-6">
                        <span className="absolute inline-flex h-full w-full animate-spin rounded-full border-2 border-white/20 border-t-violet-400" />
                      </span>
                      <span className="text-sm font-medium">{label || "Working…"} · {Math.round(progress * 100)}%</span>
                    </div>
                    <div className="h-1.5 w-64 max-w-[80%] overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-[width] duration-200"
                        style={{ width: `${Math.round(progress * 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {originalSize && (
              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-400">
                <span>Original {originalSize.w}×{originalSize.h}px</span>
                {out && (
                  <>
                    <Arrow />
                    <span className="text-slate-200">
                      Output {out.width}×{out.height}px
                    </span>
                  </>
                )}
                {file && <span>· {formatBytes(file.size)}</span>}
                {status === "done" && (
                  <span className="text-emerald-400">· {scale.toFixed(1)}× pixels</span>
                )}
              </div>
            )}
          </div>

          {/* Controls panel */}
          <aside className="order-1 flex flex-col gap-5 rounded-2xl border border-white/10 bg-white/[0.03] p-5 lg:order-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
                Enhancement
              </h3>
              <button
                onClick={reset}
                className="text-xs text-slate-400 underline-offset-2 hover:text-white hover:underline"
              >
                New image
              </button>
            </div>

            {/* Resolution */}
            <div>
              <p className="mb-2 text-xs text-slate-400">Target resolution</p>
              <div className="grid grid-cols-3 gap-2">
                {RESOLUTIONS.map((r) => {
                  const active = resolution === r.id;
                  return (
                    <button
                      key={r.id}
                      onClick={() => setResolution(r.id)}
                      className={`rounded-xl border px-2 py-3 text-center transition ${
                        active
                          ? "border-violet-400/60 bg-violet-500/15 text-white"
                          : "border-white/10 bg-white/[0.02] text-slate-300 hover:border-white/25"
                      }`}
                    >
                      <span className="block text-base font-bold">{r.label}</span>
                      <span className="block text-[10px] uppercase tracking-wide text-slate-400">
                        {r.sub}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Strength */}
            <div>
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="text-slate-400">Detail / sharpness</span>
                <span className="font-medium text-slate-200">{Math.round(strength * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(strength * 100)}
                onChange={(e) => setStrength(Number(e.target.value) / 100)}
                className="enhance-range w-full"
              />
            </div>

            {/* Format */}
            <div>
              <p className="mb-2 text-xs text-slate-400">Output format</p>
              <div className="grid grid-cols-2 gap-2">
                {(["image/jpeg", "image/png"] as EnhanceFormat[]).map((f) => {
                  const active = format === f;
                  return (
                    <button
                      key={f}
                      onClick={() => setFormat(f)}
                      className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${
                        active
                          ? "border-cyan-400/50 bg-cyan-500/15 text-white"
                          : "border-white/10 bg-white/[0.02] text-slate-300 hover:border-white/25"
                      }`}
                    >
                      {f === "image/png" ? "PNG · lossless" : "JPG · smaller"}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Action */}
            <div className="mt-1">
              {status !== "processing" ? (
                <button
                  onClick={runEnhance}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-violet-500/25 transition hover:brightness-110 active:scale-[0.99]"
                >
                  <SparkleIcon className="h-4 w-4" />
                  {status === "done" ? "Re-enhance" : `Enhance to ${resolution}`}
                </button>
              ) : (
                <button
                  onClick={cancel}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/10"
                >
                  Cancel
                </button>
              )}
            </div>

            {/* Download */}
            {status === "done" && result && (
              <div className="flex flex-col gap-2 border-t border-white/10 pt-4">
                <p className="text-xs text-slate-400">Download enhanced image</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => downloadAs("image/jpeg")}
                    disabled={downloading}
                    className="flex items-center justify-center gap-1.5 rounded-lg bg-white px-3 py-2.5 text-xs font-semibold text-slate-950 transition hover:bg-slate-200 disabled:opacity-50"
                  >
                    <DownloadIcon className="h-4 w-4" /> JPG
                  </button>
                  <button
                    onClick={() => downloadAs("image/png")}
                    disabled={downloading}
                    className="flex items-center justify-center gap-1.5 rounded-lg border border-white/20 bg-white/5 px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-white/10 disabled:opacity-50"
                  >
                    <DownloadIcon className="h-4 w-4" /> PNG
                  </button>
                </div>
                <p className="flex items-center gap-1.5 pt-1 text-[11px] text-slate-500">
                  <CheckIcon className="h-3.5 w-3.5 text-emerald-400" /> {result.width}×{result.height}px · ready offline
                </p>
              </div>
            )}

            <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <ShieldIcon className="h-3.5 w-3.5" /> Your image is processed locally and never uploaded.
            </p>
          </aside>
        </div>
      )}
    </div>
  );
}

function Arrow() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-slate-500" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14m0 0-5-5m5 5-5 5" />
    </svg>
  );
}
