import { randomUUID } from "node:crypto";
import type { MarketDataSnapshot } from "@argus/shared-types";
import { sha256 } from "./hash.js";
import { TtlCache } from "./cache.js";
import { DataFetchError, NotImplementedError } from "./errors.js";
import { fetchPrice } from "./fetchers/price.js";
import { fetchPriceFallback } from "./fetchers/price-fallback.js";
import { fetchSentiment } from "./fetchers/sentiment.js";
import { fetchSentimentFallback } from "./fetchers/sentiment-fallback.js";
import { fetchOnchainMetrics } from "./fetchers/onchain-metrics.js";
import type { PriceData } from "./fetchers/price.js";
import type { SentimentData } from "./fetchers/sentiment.js";
import type { OnchainMetricsData } from "./fetchers/onchain-metrics.js";

const DEFAULT_TTL_MS = 60_000;

export const snapshotCache = new TtlCache<MarketDataSnapshot>(DEFAULT_TTL_MS);

async function fetchWithFallback<T>(
  primary: () => Promise<T>,
  fallback: () => Promise<T>,
  metricName: string,
): Promise<T> {
  try {
    return await primary();
  } catch (primaryErr) {
    try {
      return await fallback();
    } catch (fallbackErr) {
      if (fallbackErr instanceof NotImplementedError) {
        // Fallback isn't wired yet — surface the original error, not the stub
        throw primaryErr;
      }
      throw new DataFetchError(
        metricName,
        `primary and fallback both failed`,
        { primary: primaryErr, fallback: fallbackErr },
      );
    }
  }
}

export async function fetchSnapshot(
  coinId: string,
  fetchFn: typeof fetch = fetch,
): Promise<MarketDataSnapshot> {
  const cached = snapshotCache.get(coinId);
  if (cached) return cached;

  const [price, sentiment, onchainMetrics] = await Promise.all([
    fetchWithFallback<PriceData>(
      () => fetchPrice(coinId, fetchFn),
      () => fetchPriceFallback(coinId, fetchFn),
      "price",
    ),
    fetchWithFallback<SentimentData>(
      () => fetchSentiment(fetchFn),
      () => fetchSentimentFallback(fetchFn),
      "sentiment",
    ),
    fetchOnchainMetrics(coinId, fetchFn).catch((err: unknown) => {
      // On-chain metrics provider isn't implemented yet — this is expected.
      // The snapshot proceeds without it, but the missing source is tracked
      // so the agent runner can mark onchain-sleuth's round as degraded
      // (DATA.md §4, SYNDICATE.md §5).
      if (err instanceof NotImplementedError) return null;
      throw err;
    }),
  ]);

  const sources = ["coingecko", "alternative.me/fng"];
  if (onchainMetrics) sources.push("onchain-metrics");

  const data: Record<string, unknown> = { price, sentiment };
  if (onchainMetrics) data.onchainMetrics = onchainMetrics;

  const snapshot: MarketDataSnapshot = {
    snapshotId: randomUUID(),
    asset: coinId,
    timestamp: Date.now(),
    hash: sha256(data),
    data,
    sources,
  };

  snapshotCache.set(coinId, snapshot);
  return snapshot;
}
