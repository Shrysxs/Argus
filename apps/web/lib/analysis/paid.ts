import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { ANALYSIS_COST_CENTS, chargeCredits, grantCredits } from "@/lib/billing";
import { runAnalysis, type RunAnalysisInput } from "./run-analysis";
import type { AnalysisResponse } from "./types";

/**
 * Charge for a run up front (InsufficientCreditsError → 402), then run it.
 * Refunds automatically if the run throws or no analyst produced a valid vote.
 */
export async function runPaidAnalysis(
  input: RunAnalysisInput & { costCents?: number },
): Promise<AnalysisResponse & { chargedCents: number }> {
  const cost = input.costCents ?? ANALYSIS_COST_CENTS;
  const chargeRef = `pending:${randomUUID()}`;
  if (cost > 0) await chargeCredits(input.userId, cost, "analysis", chargeRef);

  let result: AnalysisResponse;
  try {
    result = await runAnalysis(input);
  } catch (err) {
    if (cost > 0) await grantCredits(input.userId, cost, "refund", chargeRef, "Analysis failed before completion");
    throw err;
  }

  if (cost > 0) {
    await db.creditTransaction.updateMany({ where: { reference: chargeRef }, data: { reference: result.id } });
    if (result.responsiveCount === 0) {
      await grantCredits(input.userId, cost, "refund", result.id, "No analyst produced a valid vote");
      return { ...result, chargedCents: 0 };
    }
  }
  return { ...result, chargedCents: cost };
}
