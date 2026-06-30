"use client";

import { useEffect, useState } from "react";
import { LayersIcon, BoltIcon, SparkleIcon } from "@/components/Icons";

type Stats = {
  totalJobs: number;
  byResolution: Record<string, number>;
  outputPixels: number;
};

function formatMp(px: number) {
  const mp = px / 1_000_000;
  if (mp >= 1000) return `${(mp / 1000).toFixed(1)} Gpx`;
  return `${Math.round(mp).toLocaleString()} Mpx`;
}

export default function StatsStrip() {
  const [stats, setStats] = useState<Stats | null>(null);

  const load = () => {
    fetch("/api/enhancements", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d?.ok) setStats(d);
      })
      .catch(() => {});
  };

  useEffect(() => {
    load();
    const handler = () => load();
    window.addEventListener("enhancement-done", handler);
    const interval = window.setInterval(load, 20000);
    return () => {
      window.removeEventListener("enhancement-done", handler);
      window.clearInterval(interval);
    };
  }, []);

  const total = stats?.totalJobs ?? 0;
  const mp = stats?.outputPixels ?? 0;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Stat icon={<SparkleIcon className="h-5 w-5" />} value={total.toLocaleString()} label="Images enhanced" accent="from-violet-500/20 to-violet-500/0 text-violet-300" />
      <Stat icon={<LayersIcon className="h-5 w-5" />} value={`${stats?.byResolution["8K"] ?? 0}`} label="Upscaled to 8K" accent="from-cyan-500/20 to-cyan-500/0 text-cyan-300" />
      <Stat icon={<BoltIcon className="h-5 w-5" />} value={`${stats?.byResolution["4K"] ?? 0}`} label="Upscaled to 4K" accent="from-fuchsia-500/20 to-fuchsia-500/0 text-fuchsia-300" />
      <Stat icon={<SparkleIcon className="h-5 w-5" />} value={mp ? formatMp(mp) : "—"} label="Megapixels output" accent="from-emerald-500/20 to-emerald-500/0 text-emerald-300" />
    </div>
  );
}

function Stat({
  icon,
  value,
  label,
  accent,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  accent: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className={`pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br ${accent} blur-xl`} />
      <div className="relative">
        <div className="mb-2 inline-flex rounded-lg bg-white/5 p-2 text-slate-200">{icon}</div>
        <div className="text-2xl font-bold text-white">{value}</div>
        <div className="text-xs text-slate-400">{label}</div>
      </div>
    </div>
  );
}
