import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getDecision } from "@/lib/decisions";
import { buildSealPayload } from "@/lib/analysis/seal-payload";

/** Full decision record: votes, reasoning, snapshot, hashes and seal payload. */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const viewer = await getSessionUser(req).catch(() => null);
  const decision = await getDecision(id, viewer?.id ?? null);
  if (!decision) return NextResponse.json({ error: "Decision not found" }, { status: 404 });
  return NextResponse.json({ ...decision, sealPayload: buildSealPayload(decision) });
}
