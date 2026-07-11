// MATH.md §4: f* = (p·b - (1-p)) / b
export function computeKellyFraction(p: number, b: number): number {
  if (p < 0 || p > 1) {
    throw new RangeError(`computeKellyFraction: p must be in [0, 1], got ${p}`);
  }
  if (b <= 0) {
    throw new RangeError(`computeKellyFraction: b must be > 0, got ${b}`);
  }

  return (p * b - (1 - p)) / b;
}

// MATH.md §4: ESV = f* × AUM_ref
// TODO: Clearing price is the (N+1)th highest sealed bid — see ONCHAIN.md §3 for commit-reveal mechanics.
export function computeAuctionReserve(p: number, b: number, aumRef: number): number {
  if (aumRef < 0) {
    throw new RangeError(`computeAuctionReserve: aumRef must be >= 0, got ${aumRef}`);
  }

  const fStar = computeKellyFraction(p, b);

  // Negative Kelly means the bet is unfavorable — reserve is 0
  return Math.max(0, fStar * aumRef);
}
