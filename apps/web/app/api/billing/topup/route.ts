import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  const sessionUser = await getSessionUser(req);
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    // Body is optional; default topup amount applied if missing
  }

  const rawAmount = typeof body?.amountUsd === "number" ? body.amountUsd : 25.0;
  if (isNaN(rawAmount) || rawAmount <= 0) {
    return NextResponse.json(
      { error: "Invalid topup amount: amountUsd must be a positive number" },
      { status: 400 }
    );
  }

  // Atomically increment user credit balance
  const updatedUser = await db.user.update({
    where: { id: sessionUser.id },
    data: { creditsUsd: { increment: rawAmount } },
    select: { id: true, email: true, creditsUsd: true },
  });

  return NextResponse.json({
    message: "Credit top-up successful",
    amountAddedUsd: rawAmount,
    newBalanceUsd: updatedUser.creditsUsd,
    paymentProcessor: "manual_admin_test_grant",
    note: "Real payment processing (Stripe or similar) is a deliberately separate next step.",
  });
}
