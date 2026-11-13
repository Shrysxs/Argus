import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { scorePendingOutcomes } from "@/lib/outcomes";

export const maxDuration = 300;

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const got = Buffer.from(req.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  return got.length === want.length && timingSafeEqual(got, want);
}

/** Scores sealed decisions whose horizon has passed. Invoked by Vercel Cron (Authorization: Bearer $CRON_SECRET). */
export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await scorePendingOutcomes();
  if (result.failed.length) console.warn("score-outcomes failures:", result.failed);
  return NextResponse.json({ scored: result.scored.length, failed: result.failed, remaining: result.remaining });
}
