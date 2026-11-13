import { db } from "@/lib/db";

/** Price of one committee run. Set ANALYSIS_COST_CENTS=0 to make runs free. */
export const ANALYSIS_COST_CENTS = (() => {
  const raw = process.env.ANALYSIS_COST_CENTS;
  const n = raw === undefined || raw === "" ? 100 : Number(raw);
  return Number.isInteger(n) && n >= 0 ? n : 100;
})();
export const SIGNUP_GRANT_CENTS = 2500;

export type CreditKind = "signup_grant" | "analysis" | "refund" | "admin_grant" | "opening_balance";

export class InsufficientCreditsError extends Error {
  constructor(
    public readonly requiredCents: number,
    public readonly balanceCents: number,
  ) {
    super(`Insufficient credits: this costs ${formatCents(requiredCents)}, your balance is ${formatCents(balanceCents)}.`);
    this.name = "InsufficientCreditsError";
  }
}

export const formatCents = (c: number) => `$${(c / 100).toFixed(2)}`;
export const centsToUsd = (c: number) => c / 100;

type Tx = Parameters<Parameters<typeof db.$transaction>[0]>[0];

/**
 * Atomically debit `cents` and write the ledger row. The conditional UPDATE
 * (plus a CHECK >= 0 constraint) makes overdrafts impossible under concurrency.
 */
export async function chargeCredits(userId: string, cents: number, kind: CreditKind, reference?: string, note?: string) {
  if (!Number.isInteger(cents) || cents < 0) throw new RangeError("chargeCredits: cents must be a non-negative integer");
  return db.$transaction(async (tx: Tx) => {
    const rows = await tx.$queryRaw<{ credits_cents: number }[]>`
      UPDATE "users" SET "credits_cents" = "credits_cents" - ${cents}
      WHERE "id" = ${userId} AND "credits_cents" >= ${cents}
      RETURNING "credits_cents"`;
    if (rows.length === 0) {
      const u = await tx.user.findUnique({ where: { id: userId }, select: { creditsCents: true } });
      throw new InsufficientCreditsError(cents, u?.creditsCents ?? 0);
    }
    const balance = Number(rows[0]!.credits_cents);
    await tx.creditTransaction.create({
      data: { userId, amountCents: -cents, balanceAfterCents: balance, kind, reference, note },
    });
    return { balanceCents: balance };
  });
}

/** Atomically credit `cents` and write the ledger row. */
export async function grantCredits(userId: string, cents: number, kind: CreditKind, reference?: string, note?: string) {
  if (!Number.isInteger(cents) || cents <= 0) throw new RangeError("grantCredits: cents must be a positive integer");
  return db.$transaction(async (tx: Tx) => {
    const rows = await tx.$queryRaw<{ credits_cents: number }[]>`
      UPDATE "users" SET "credits_cents" = "credits_cents" + ${cents}
      WHERE "id" = ${userId}
      RETURNING "credits_cents"`;
    if (rows.length === 0) throw new Error("User not found");
    const balance = Number(rows[0]!.credits_cents);
    await tx.creditTransaction.create({
      data: { userId, amountCents: cents, balanceAfterCents: balance, kind, reference, note },
    });
    return { balanceCents: balance };
  });
}

/** Writes the signup grant ledger entry for a freshly created user (balance already set by the column default). */
export async function recordSignupGrant(userId: string, tx: Tx | typeof db = db) {
  await tx.creditTransaction.create({
    data: { userId, amountCents: SIGNUP_GRANT_CENTS, balanceAfterCents: SIGNUP_GRANT_CENTS, kind: "signup_grant", note: "Starter credits" },
  });
}

export async function listTransactions(userId: string, take = 50) {
  return db.creditTransaction.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take });
}
