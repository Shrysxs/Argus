import type { HistoricalCall } from "@argus/shared-types";

// MATH.md §2: ~90-day half-life → λ = ln(2) / 90
export const DEFAULT_LAMBDA = Math.LN2 / 90;

// MATH.md §2: R_i(t) = 1 - Σ(w_k · (f_k - o_k)²) / Σ(w_k)
// w_k = e^(-λ · Δt_k)
// f_k = agent's stated confidence (0–1)
// o_k ∈ {0, 1} = whether call was correct
export function computeReputation(
  calls: HistoricalCall[],
  lambda: number = DEFAULT_LAMBDA,
): number {
  if (calls.length === 0) {
    throw new RangeError("computeReputation: calls array must not be empty");
  }

  if (lambda < 0) {
    throw new RangeError(`computeReputation: lambda must be >= 0, got ${lambda}`);
  }

  let weightedErrorSum = 0;
  let totalWeight = 0;

  for (const call of calls) {
    if (call.confidence < 0 || call.confidence > 1) {
      throw new RangeError(
        `computeReputation: confidence must be in [0, 1], got ${call.confidence}`,
      );
    }
    if (call.ageInDays < 0) {
      throw new RangeError(
        `computeReputation: ageInDays must be >= 0, got ${call.ageInDays}`,
      );
    }

    const w = Math.exp(-lambda * call.ageInDays);
    const error = (call.confidence - call.correct) ** 2;
    weightedErrorSum += w * error;
    totalWeight += w;
  }

  // totalWeight can't be 0 if calls is non-empty and lambda >= 0
  // (e^(-x) > 0 for all finite x), but guard anyway
  if (totalWeight === 0) {
    throw new RangeError("computeReputation: total weight is 0");
  }

  return 1 - weightedErrorSum / totalWeight;
}
