import { DataFetchError } from "../errors";
import { getCoinUniverse, resolveCoinId, resolveSymbol } from "./coins";
import { coingeckoRequest } from "./coingecko";
import { cryptocompareGet } from "./cryptocompare";

export interface HistoricalPrice {
  priceUsd: number;
  /** Timestamp (ms) of the data point actually used. */
  timestamp: number;
  source: string;
}

/** Max distance between the requested time and the data point used. */
const MAX_SKEW_MS = 3 * 60 * 60 * 1000;

function closest(points: [number, number][], target: number): [number, number] | null {
  let best: [number, number] | null = null;
  for (const p of points) {
    if (!Array.isArray(p) || typeof p[0] !== "number" || typeof p[1] !== "number" || !(p[1] > 0)) continue;
    if (!best || Math.abs(p[0] - target) < Math.abs(best[0] - target)) best = p;
  }
  return best && Math.abs(best[0] - target) <= MAX_SKEW_MS ? best : null;
}

async function fromCoinGecko(coinId: string, at: number, fetchFn: typeof fetch): Promise<HistoricalPrice> {
  const universe = await getCoinUniverse(fetchFn);
  const cgId = resolveCoinId(coinId, universe);
  const { url, init } = coingeckoRequest(
    `/coins/${encodeURIComponent(cgId)}/market_chart/range`,
    new URLSearchParams({
      vs_currency: "usd",
      from: String(Math.floor((at - MAX_SKEW_MS) / 1000)),
      to: String(Math.ceil((at + MAX_SKEW_MS) / 1000)),
    }),
  );
  const res = await fetchFn(url, init).catch((err) => {
    throw new DataFetchError("coingecko/range", "network request failed", err);
  });
  if (!res.ok) throw new DataFetchError("coingecko/range", `HTTP ${res.status}`);
  const json = (await res.json()) as { prices?: [number, number][] };
  const best = closest(json.prices ?? [], at);
  if (!best) throw new DataFetchError("coingecko/range", "no price point near the requested time");
  return { priceUsd: best[1], timestamp: best[0], source: "coingecko/range" };
}

async function fromCryptoCompare(coinId: string, at: number, fetchFn: typeof fetch): Promise<HistoricalPrice> {
  const symbol = resolveSymbol(coinId, await getCoinUniverse(fetchFn));
  const json = await cryptocompareGet<{ Data?: { Data?: { time: number; close: number }[] } }>(
    "/v2/histohour",
    new URLSearchParams({ fsym: symbol, tsym: "USD", limit: "6", toTs: String(Math.ceil((at + MAX_SKEW_MS) / 1000)) }),
    fetchFn,
  );
  const best = closest((json.Data?.Data ?? []).map((r) => [r.time * 1000, r.close]), at);
  if (!best) throw new DataFetchError("cryptocompare/histohour", "no price point near the requested time");
  return { priceUsd: best[1], timestamp: best[0], source: "cryptocompare/histohour" };
}

/** USD price of an asset at (or within 3h of) a past timestamp. */
export async function fetchPriceAt(coinId: string, at: number, fetchFn: typeof fetch = fetch): Promise<HistoricalPrice> {
  if (at > Date.now()) throw new DataFetchError("price-at", "requested time is in the future");
  try {
    return await fromCoinGecko(coinId, at, fetchFn);
  } catch (primary) {
    try {
      return await fromCryptoCompare(coinId, at, fetchFn);
    } catch (fallback) {
      throw new DataFetchError("price-at", "primary and fallback both failed", { primary, fallback });
    }
  }
}
