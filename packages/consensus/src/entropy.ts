import type { VoteDirection, SignalPriceParams } from "@argus/shared-types";

// MATH.md §3: H_max = log₂(3) — max entropy for 3 possible directions
export const H_MAX = Math.log2(3);

// MATH.md §3: H(p) = -Σ(p_d · log₂(p_d)), p_d = W_d / Σ(W_d)
export function computeEntropy(breakdown: Record<VoteDirection, number>): number {
  const weights = Object.values(breakdown);
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);

  if (totalWeight === 0) {
    throw new RangeError("computeEntropy: total weight is 0");
  }

  let entropy = 0;
  for (const w of weights) {
    if (w < 0) {
      throw new RangeError(`computeEntropy: negative weight ${w}`);
    }
    if (w === 0) continue; // 0 · log(0) = 0 by convention
    const p = w / totalWeight;
    entropy -= p * Math.log2(p);
  }

  return entropy;
}

// MATH.md §3: I = H_max - H(p)
export function computeInformationValue(breakdown: Record<VoteDirection, number>): number {
  return H_MAX - computeEntropy(breakdown);
}

// MATH.md §3: Price_call = base × (I / H_max)^γ × vol_multiplier
export function computeSignalPrice(params: SignalPriceParams): number {
  const { breakdown, basePriceUsd, gamma, volatilityMultiplier } = params;

  if (gamma < 2 || gamma > 3) {
    throw new RangeError(`computeSignalPrice: gamma must be in [2, 3], got ${gamma}`);
  }
  if (basePriceUsd < 0) {
    throw new RangeError(`computeSignalPrice: basePriceUsd must be >= 0, got ${basePriceUsd}`);
  }
  if (volatilityMultiplier < 0) {
    throw new RangeError(
      `computeSignalPrice: volatilityMultiplier must be >= 0, got ${volatilityMultiplier}`,
    );
  }

  const I = computeInformationValue(breakdown);
  const normalizedI = I / H_MAX;

  return basePriceUsd * normalizedI ** gamma * volatilityMultiplier;
}
