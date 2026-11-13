import { computeEntropy, computeInformationValue, computeSignalPrice, H_MAX } from "@argus/consensus";
import type { VoteDirection } from "@argus/shared-types";

export const SIGNAL_BASE_PRICE_USD = 10;
export const SIGNAL_GAMMA = 2.5;

/**
 * Volatility multiplier from the snapshot's realized 30d volatility,
 * normalized so ~50% annualized vol (BTC-like) = 1.0x, clamped to [0.5, 3].
 */
export function volatilityMultiplier(snapshotData: unknown): { value: number; source: string } {
  const vol = (snapshotData as { technicals?: { realizedVol30dPct?: unknown } } | null)?.technicals?.realizedVol30dPct;
  if (typeof vol === "number" && vol > 0) {
    return { value: Math.min(3, Math.max(0.5, vol / 50)), source: "realized_vol_30d" };
  }
  return { value: 1, source: "default (no volatility data)" };
}

export function quoteSignal(breakdown: Record<string, number>, snapshotData: unknown) {
  const b = { BUY: Number(breakdown?.BUY ?? 0), SELL: Number(breakdown?.SELL ?? 0), HOLD: Number(breakdown?.HOLD ?? 0) } as Record<VoteDirection, number>;
  if (b.BUY + b.SELL + b.HOLD <= 0) return null;
  const vm = volatilityMultiplier(snapshotData);
  const price = computeSignalPrice({ breakdown: b, basePriceUsd: SIGNAL_BASE_PRICE_USD, gamma: SIGNAL_GAMMA, volatilityMultiplier: vm.value });
  return {
    entropy: Number(computeEntropy(b).toFixed(4)),
    maxEntropy: Number(H_MAX.toFixed(4)),
    informationValue: Number(computeInformationValue(b).toFixed(4)),
    priceUsd: Number(price.toFixed(2)),
    pricingParameters: { basePriceUsd: SIGNAL_BASE_PRICE_USD, gamma: SIGNAL_GAMMA, volatilityMultiplier: Number(vm.value.toFixed(3)), volatilitySource: vm.source },
  };
}
