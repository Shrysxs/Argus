import { NotImplementedError } from "../errors.js";

export interface OnchainMetricsData {
  mvrv: number;
  sopr: number;
  exchangeNetflow: number;
  whaleScore: number;
  fetchedAt: number;
}

// DATA.md §1: on-chain metrics provider not yet selected.
// Candidates: Glassnode, CryptoQuant, IntoTheBlock, Santiment.
// Decision should be logged in docs/chain-decision.md.
export async function fetchOnchainMetrics(
  _coinId: string,
  _fetchFn: typeof fetch = fetch,
): Promise<OnchainMetricsData> {
  throw new NotImplementedError("onchain-metrics");
}
