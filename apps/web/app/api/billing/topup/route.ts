import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { centsToUsd, grantCredits } from "@/lib/billing";

/** Admin-only manual credit grant (support / testing). Body: { amountUsd?: number, targetUserId?: string, note?: string } */
export async function POST(req: Request) {
  const sessionUser = await getSessionUser(req);
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!sessionUser.isAdmin) {
    return NextResponse.json({ error: "Forbidden: Admin privileges required to grant credit top-ups." }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as { amountUsd?: unknown; targetUserId?: unknown; note?: unknown };
  const amountUsd = typeof body.amountUsd === "number" ? body.amountUsd : 25;
  const cents = Math.round(amountUsd * 100);
  if (!Number.isFinite(amountUsd) || cents <= 0 || cents > 1_000_000) {
    return NextResponse.json({ error: "Invalid topup amount: amountUsd must be between 0.01 and 10000" }, { status: 400 });
  }

  const targetUserId = typeof body.targetUserId === "string" && body.targetUserId.trim() ? body.targetUserId.trim() : sessionUser.id;
  const target = await db.user.findUnique({ where: { id: targetUserId }, select: { id: true } });
  if (!target) {
    return NextResponse.json({ error: "Target user not found" }, { status: 404 });
  }

  const { balanceCents } = await grantCredits(
    targetUserId,
    cents,
    "admin_grant",
    sessionUser.id,
    typeof body.note === "string" ? body.note.slice(0, 200) : undefined,
  );

  return NextResponse.json({
    message: "Credit top-up successful",
    amountAddedUsd: centsToUsd(cents),
    newBalanceUsd: centsToUsd(balanceCents),
  });
}
