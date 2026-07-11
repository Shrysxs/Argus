// MATH.md §5: P_i(R) = P_0 · e^(k · R_i(t))
// P_0 and k are immutable per-agent launch parameters.
// R_i(t) comes from §2 (reputation index, ∈ [0, 1]).
export function computeBondingPrice(p0: number, k: number, reputation: number): number {
  if (p0 < 0) {
    throw new RangeError(`computeBondingPrice: p0 must be >= 0, got ${p0}`);
  }
  if (reputation < 0 || reputation > 1) {
    throw new RangeError(
      `computeBondingPrice: reputation must be in [0, 1], got ${reputation}`,
    );
  }

  return p0 * Math.exp(k * reputation);
}
