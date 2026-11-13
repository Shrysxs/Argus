import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { ANALYSIS_COST_CENTS, centsToUsd, listTransactions } from "@/lib/billing";

export async function GET(req: Request) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const txns = await listTransactions(user.id, 20);
  return NextResponse.json({
    userId: user.id,
    email: user.email,
    creditsUsd: centsToUsd(user.creditsCents),
    creditsCents: user.creditsCents,
    analysisCostUsd: centsToUsd(ANALYSIS_COST_CENTS),
    transactions: txns.map((t) => ({
      id: t.id,
      kind: t.kind,
      amountUsd: centsToUsd(t.amountCents),
      balanceAfterUsd: centsToUsd(t.balanceAfterCents),
      reference: t.reference,
      createdAt: t.createdAt,
    })),
  });
}
