import type { VaultFeeParams } from "@argus/shared-types";

// MATH.md §6: Fee = m · AUM + p · max(0, V_t - HWM)
// TODO: HWM tracking (updates only upward) is enforced on-chain per ONCHAIN.md §4.
export function computeVaultFee(params: VaultFeeParams): number {
  const { managementFeeRate, performanceFeeRate, aum, currentValue, highWaterMark } = params;

  if (managementFeeRate < 0) {
    throw new RangeError(
      `computeVaultFee: managementFeeRate must be >= 0, got ${managementFeeRate}`,
    );
  }
  if (performanceFeeRate < 0) {
    throw new RangeError(
      `computeVaultFee: performanceFeeRate must be >= 0, got ${performanceFeeRate}`,
    );
  }
  if (aum < 0) {
    throw new RangeError(`computeVaultFee: aum must be >= 0, got ${aum}`);
  }

  const managementFee = managementFeeRate * aum;
  const profit = Math.max(0, currentValue - highWaterMark);
  const performanceFee = performanceFeeRate * profit;

  return managementFee + performanceFee;
}
