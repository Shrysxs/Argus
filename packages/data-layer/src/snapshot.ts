import { randomUUID } from "node:crypto";
import type { MarketDataSnapshot } from "@argus/shared-types";
import { sha256 } from "./hash.js";
import { TtlCache } from "./cache.js";
import { fetchPrice } from "./fetchers/price.js";
import { fetchSentiment } from "./fetchers/sentiment.js";

// 60 seconds — short enough to stay fresh, long enough to absorb repeated
// UI clicks without burning free-tier rate limits.
const DEFAULT_TTL_MS = 60_000;

const snapshotCache = new TtlCache<MarketDataSnapshot>(DEFAULT_TTL_MS);

/**
 * Fetch price + sentiment for the given CoinGecko coin id, hash the result,
 * and return a MarketDataSnapshot.
 *
 * Results are cached for 60 seconds. Pass a custom `fetchFn` to mock in tests.
 *
 * Throws `DataFetchError` if either source fails — does not fall back to
 * stale data or partial results.
 */
export async function fetchSnapshot(
  coinId: string,
  fetchFn: typeof fetch = fetch
): Promise<MarketDataSnapshot> {
  const cached = snapshotCache.get(coinId);
  if (cached) return cached;

  // Both fetches run concurrently. If either throws, the whole call throws —
  // we don't want to give agents a snapshot where half the data is missing.
  const [price, sentiment] = await Promise.all([
    fetchPrice(coinId, fetchFn),
    fetchSentiment(fetchFn),
  ]);

  const data = { price, sentiment };
  const snapshot: MarketDataSnapshot = {
    snapshotId: randomUUID(),
    asset: coinId,
    timestamp: Date.now(),
    hash: sha256(data),
    data,
    sources: ["coingecko", "alternative.me/fng"],
  };

  snapshotCache.set(coinId, snapshot);
  return snapshot;
}

/** Exposed for testing — bypass the module-level cache singleton. */
export { snapshotCache };
