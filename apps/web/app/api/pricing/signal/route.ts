import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getDecision } from "@/lib/decisions";
import { quoteSignal } from "@/lib/signal-quote";

/**
 * Read-only entropy-based value quote for a stored decision (MATH.md §3).
 * GET /api/pricing/signal?id=<decision id>
 *
 * The quote is computed from the stored vote breakdown — never from
 * client-supplied numbers — and nothing is charged.
 */
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id") ?? "";
  const viewer = await getSessionUser(req).catch(() => null);
  const d = await getDecision(id, viewer?.id ?? null);
  if (!d) return NextResponse.json({ error: "Decision not found" }, { status: 404 });
  const quote = quoteSignal(d.breakdown as Record<string, number>, d.snapshot?.data);
  if (!quote) return NextResponse.json({ error: "This decision has no votes to price" }, { status: 422 });
  return NextResponse.json({ id: d.id, asset: d.asset, recommendation: d.recommendation, ...quote });
}

export async function POST() {
  return NextResponse.json(
    { error: "Signal pricing is read-only. Use GET /api/pricing/signal?id=<decision id>." },
    { status: 405, headers: { Allow: "GET" } },
  );
}
