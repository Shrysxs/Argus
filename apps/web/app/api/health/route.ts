import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Liveness/readiness probe. Deliberately reveals nothing about configuration
 * or error details — only whether dependencies are reachable.
 */
export async function GET() {
  const started = Date.now();
  let database: "ok" | "down" = "ok";
  try {
    await db.$queryRaw`SELECT 1`;
  } catch (err) {
    database = "down";
    console.error("health: database check failed", err);
  }
  const ok = database === "ok";
  return NextResponse.json(
    { status: ok ? "ok" : "degraded", checks: { database }, latencyMs: Date.now() - started },
    { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
