import EnhancerStudio from "@/components/EnhancerStudio";
import StatsStrip from "@/components/StatsStrip";
import {
  BoltIcon,
  LayersIcon,
  ShieldIcon,
  WandIcon,
  SparkleIcon,
  ImageIcon,
} from "@/components/Icons";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#060815] text-white">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[40rem] w-[40rem] -translate-x-1/2 rounded-full bg-violet-600/20 blur-[120px] animate-float-slow" />
        <div className="absolute -right-32 top-1/3 h-[32rem] w-[32rem] rounded-full bg-cyan-500/15 blur-[120px]" />
        <div className="absolute -left-32 bottom-0 h-[30rem] w-[30rem] rounded-full bg-fuchsia-600/10 blur-[120px]" />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-6xl px-5 pb-24">
        {/* Nav */}
        <header className="flex items-center justify-between py-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400 text-slate-950">
              <WandIcon className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold tracking-tight">PixelLift</span>
          </div>
          <div className="hidden items-center gap-6 text-sm text-slate-400 sm:flex">
            <a href="#enhancer" className="transition hover:text-white">Enhancer</a>
            <a href="#features" className="transition hover:text-white">Features</a>
            <a href="#how" className="transition hover:text-white">How it works</a>
          </div>
        </header>

        {/* Hero */}
        <section className="mx-auto max-w-3xl pt-10 text-center sm:pt-16 animate-fade-up">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            100% in-browser · private &amp; instant
          </span>
          <h1 className="mt-5 text-balance text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
            Upscale your images to
            <span className="block bg-gradient-to-r from-violet-400 via-fuchsia-300 to-cyan-300 bg-clip-text text-transparent">
              2K · 4K · 8K
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-pretty text-base text-slate-300 sm:text-lg">
            Upload a photo and PixelLift enhances sharpness, detail and color to
            produce crisp, high-resolution output — right inside your browser.
          </p>
          <div className="mt-7 flex items-center justify-center gap-3">
            <a
              href="#enhancer"
              className="rounded-xl bg-gradient-to-r from-violet-500 to-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-violet-500/25 transition hover:brightness-110"
            >
              Try it now — free
            </a>
            <a href="#how" className="rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/10">
              How it works
            </a>
          </div>
        </section>

        {/* Studio */}
        <section id="enhancer" className="mt-14 scroll-mt-8">
          <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-4 shadow-2xl shadow-black/40 backdrop-blur sm:p-6">
            <EnhancerStudio />
          </div>
        </section>

        {/* Stats */}
        <section className="mt-10">
          <StatsStrip />
        </section>

        {/* Features */}
        <section id="features" className="mt-24 scroll-mt-8">
          <h2 className="text-center text-2xl font-bold sm:text-3xl">
            Built for crisp, detailed results
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-slate-400">
            A real enhancement pipeline — not a simple stretch. Progressive
            resampling, unsharp masking and color science combine for genuine
            quality gains.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Feature
              icon={<BoltIcon className="h-6 w-6" />}
              title="Up to 8K resolution"
              body="Render long-edge targets of 2560, 3840 or 7680px while preserving the original aspect ratio."
            />
            <Feature
              icon={<WandIcon className="h-6 w-6" />}
              title="Detail recovery"
              body="A separable unsharp mask reclaims crispness and edges that interpolation softens when upscaling."
            />
            <Feature
              icon={<SparkleIcon className="h-6 w-6" />}
              title="Color &amp; clarity boost"
              body="Adaptive contrast, saturation and brightness lift give every image a punchy, premium look."
            />
            <Feature
              icon={<ShieldIcon className="h-6 w-6" />}
              title="Totally private"
              body="Files are decoded and processed locally. Nothing is ever uploaded to a server."
            />
            <Feature
              icon={<ImageIcon className="h-6 w-6" />}
              title="JPG &amp; PNG export"
              body="Download lossy JPG for sharing or lossless PNG for maximum fidelity — your choice."
            />
            <Feature
              icon={<LayersIcon className="h-6 w-6" />}
              title="Before / after compare"
              body="A draggable slider lets you inspect the original versus the enhanced result pixel-for-pixel."
            />
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="mt-24 scroll-mt-8">
          <h2 className="text-center text-2xl font-bold sm:text-3xl">Three steps to sharper images</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <Step n="1" title="Upload" body="Drag in or browse for any JPG, PNG or WebP image up to 60 MB." />
            <Step n="2" title="Choose &amp; enhance" body="Pick 2K, 4K or 8K, dial in sharpness, and run the enhancement pipeline." />
            <Step n="3" title="Compare &amp; download" body="Inspect with the slider, then export your enhanced image in seconds." />
          </div>
        </section>

        {/* CTA */}
        <section className="mt-24">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-violet-600/20 to-cyan-500/10 p-10 text-center">
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-violet-500/30 blur-3xl" />
            <h2 className="relative text-2xl font-bold sm:text-3xl">Ready to upscale?</h2>
            <p className="relative mx-auto mt-3 max-w-md text-slate-300">
              No sign-up, no upload, no watermark. Just sharper, bigger images.
            </p>
            <a
              href="#enhancer"
              className="relative mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
            >
              <SparkleIcon className="h-4 w-4" /> Enhance an image
            </a>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-20 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-8 text-sm text-slate-500 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-violet-500 to-cyan-400 text-slate-950">
              <WandIcon className="h-3.5 w-3.5" />
            </div>
            <span>PixelLift — in-browser image enhancement</span>
          </div>
          <span>All processing happens on your device.</span>
        </footer>
      </div>
    </main>
  );
}

function Feature({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="group rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-white/20 hover:bg-white/[0.05]">
      <div className="mb-4 inline-flex rounded-xl bg-gradient-to-br from-violet-500/20 to-cyan-400/20 p-3 text-violet-200 transition group-hover:from-violet-500/30 group-hover:to-cyan-400/30">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-white" dangerouslySetInnerHTML={{ __html: title }} />
      <p className="mt-2 text-sm text-slate-400" dangerouslySetInnerHTML={{ __html: body }} />
    </div>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="relative rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 text-sm font-bold text-slate-950">
        {n}
      </div>
      <h3 className="text-base font-semibold text-white" dangerouslySetInnerHTML={{ __html: title }} />
      <p className="mt-2 text-sm text-slate-400" dangerouslySetInnerHTML={{ __html: body }} />
    </div>
  );
}
