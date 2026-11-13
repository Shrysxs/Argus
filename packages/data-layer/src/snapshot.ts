import { randomUUID } from "node:crypto";
import type { MarketDataSnapshot } from "@argus/shared-types";
import { sha256 } from "./hash";
import { TtlCache } from "./cache";
import { DataFetchError, NotImplementedError } from "./errors";
import { fetchPrice } from "./fetchers/price";
import { fetchPriceFallback } from "./fetchers/price-fallback";
import { fetchSentiment } from "./fetchers/sentiment";
import { fetchSentimentFallback } from "./fetchers/sentiment-fallback";
import { fetchOnchainMetrics } from "./fetchers/onchain-metrics";
import { fetchPriceHistory, fetchPriceHistoryFallback } from "./fetchers/history";
import { getCoinUniverse, resolveCoinId } from "./fetchers/coins";
import { computeTechnicals } from "./indicators";
import type { PriceData } from "./fetchers/price";
import type { SentimentData } from "./fetchers/sentiment";
import type { PriceHistory } from "./fetchers/history";

const DEFAULT_TTL_MS = 60_000;

export const snapshotCache = new TtlCache<MarketDataSnapshot>(DEFAULT_TTL_MS);
/** Daily history changes slowly; cache it longer to spare free-tier quotas. */
export const historyCache = new TtlCache<PriceHistory>(10 * 60_000);

interface Sourced<T> {
  value: T;
  source: string;
}

async function withFallback<T>(
  metric: string,
  primary: Sourced<() => Promise<T>>,
  fallback: Sourced<() => Promise<T>>,
): Promise<Sourced<T>> {
  try {
    return { value: await primary.value(), source: primary.source };
  } catch (primaryErr) {
    try {
      return { value: await fallback.value(), source: fallback.source };
    } catch (fallbackErr) {
      if (fallbackErr instanceof NotImplementedError) throw primaryErr;
      throw new DataFetchError(metric, "primary and fallback both failed", { primary: primaryErr, fallback: fallbackErr });
    }
  }
}

const reason = (err: unknown) => (err instanceof Error ? err.message : String(err));

/**
 * Build a hashed snapshot for one asset.
 *
 * Spot price is mandatory (throws if every source fails). Sentiment, price
 * history (technicals) and on-chain metrics are optional: when unavailable the
 * snapshot records why in `unavailable`, and agents that require that data
 * abstain instead of guessing (AGENTS.md §2 principle 5).
 */
export async function fetchSnapshot(coinId: string, fetchFn: typeof fetch = fetch): Promise<MarketDataSnapshot> {
  const cached = snapshotCache.get(coinId);
  if (cached) return cached;

  // Reject unknown assets up front (UnsupportedAssetError) instead of letting
  // every provider fail and reporting it as an outage.
  resolveCoinId(coinId, await getCoinUniverse(fetchFn));

  const unavailable: Record<string, string> = {};

  const [price, sentiment, history, onchainMetrics] = await Promise.all([
    withFallback<PriceData>(
      "price",
      { value: () => fetchPrice(coinId, fetchFn), source: "coingecko" },
      { value: () => fetchPriceFallback(coinId, fetchFn), source: "cryptocompare" },
    ),
    withFallback<SentimentData>(
      "sentiment",
      { value: () => fetchSentiment(fetchFn), source: "alternative.me/fng" },
      { value: () => fetchSentimentFallback(fetchFn), source: "sentiment-fallback" },
    ).catch((err) => {
      unavailable.sentiment = reason(err);
      return null;
    }),
    (async (): Promise<Sourced<PriceHistory> | null> => {
      const hit = historyCache.get(coinId);
      if (hit) return { value: hit, source: hit.source };
      try {
        const h = await withFallback<PriceHistory>(
          "price-history",
          { value: () => fetchPriceHistory(coinId, fetchFn), source: "coingecko/market_chart" },
          { value: () => fetchPriceHistoryFallback(coinId, fetchFn), source: "cryptocompare/histoday" },
        );
        historyCache.set(coinId, h.value);
        return h;
      } catch (err) {
        unavailable.technicals = reason(err);
        return null;
      }
    })(),
    fetchOnchainMetrics(coinId, fetchFn).catch((err: unknown) => {
      unavailable.onchainMetrics =
        err instanceof NotImplementedError ? "no on-chain metrics provider configured" : reason(err);
      return null;
    }),
  ]);

  const sources = [price.source];
  const data: Record<string, unknown> = { price: price.value };

  if (sentiment) {
    data.sentiment = sentiment.value;
    sources.push(sentiment.source);
  }
  if (history) {
    // Use the live spot price as the latest close so indicators reflect "now".
    const closes = [...history.value.closes.slice(0, -1), price.value.priceUsd];
    data.technicals = { ...computeTechnicals(closes, history.value.volumes), source: history.source };
    sources.push(history.source);
  }
  if (onchainMetrics) {
    data.onchainMetrics = onchainMetrics;
    sources.push("onchain-metrics");
  }

  const snapshot: MarketDataSnapshot = {
    snapshotId: randomUUID(),
    asset: coinId,
    timestamp: Date.now(),
    hash: sha256(data),
    data,
    sources,
    unavailable,
  };

  snapshotCache.set(coinId, snapshot);
  return snapshot;
}
