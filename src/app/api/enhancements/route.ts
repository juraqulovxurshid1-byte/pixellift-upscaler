import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { enhancements } from "@/db/schema";
import { count, sum } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALLOWED = new Set(["2K", "4K", "8K"]);

/** GET /api/enhancements -> aggregate usage dashboard data. */
export async function GET() {
  try {
    const rows = await db
      .select({
        resolution: enhancements.resolution,
        total: count(),
        sourcePixels: sum(enhancements.sourcePixels),
        outputPixels: sum(enhancements.outputPixels),
      })
      .from(enhancements)
      .groupBy(enhancements.resolution);

    const byResolution: Record<string, number> = { "2K": 0, "4K": 0, "8K": 0 };
    let totalJobs = 0;
    let totalSourcePixels = 0;
    let totalOutputPixels = 0;

    for (const r of rows) {
      const n = Number(r.total ?? 0);
      byResolution[r.resolution] = n;
      totalJobs += n;
      totalSourcePixels += Number(r.sourcePixels ?? 0);
      totalOutputPixels += Number(r.outputPixels ?? 0);
    }

    return NextResponse.json({
      ok: true,
      totalJobs,
      byResolution,
      sourcePixels: totalSourcePixels,
      outputPixels: totalOutputPixels,
    });
  } catch (err) {
    console.error("enhancements GET failed", err);
    return NextResponse.json(
      { ok: false, totalJobs: 0, byResolution: { "2K": 0, "4K": 0, "8K": 0 } },
      { status: 200 },
    );
  }
}

/** POST /api/enhancements -> record one completed enhancement (anonymous). */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const resolution = String(body?.resolution ?? "").toUpperCase();
    const sourcePixels = Math.max(
      0,
      Math.min(400_000_000, Number(body?.sourcePixels ?? 0) || 0),
    );
    const outputPixels = Math.max(
      0,
      Math.min(400_000_000, Number(body?.outputPixels ?? 0) || 0),
    );

    if (!ALLOWED.has(resolution)) {
      return NextResponse.json(
        { ok: false, error: "Invalid resolution" },
        { status: 400 },
      );
    }

    await db
      .insert(enhancements)
      .values({ resolution, sourcePixels, outputPixels });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("enhancements POST failed", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}


