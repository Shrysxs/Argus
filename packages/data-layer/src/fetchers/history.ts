import { DataFetchError } from "../errors";
import { getCoinUniverse, resolveCoinId, resolveSymbol } from "./coins";
import { coingeckoRequest } from "./coingecko";
import { cryptocompareGet } from "./cryptocompare";

export interface PriceHistory {
  source: string;
  /** Daily closes, oldest first. */
  closes: number[];
  /** Daily USD volumes aligned with closes (may be empty). */
  volumes: number[];
  /** Timestamp (ms) of the last close. */
  lastTimestamp: number;
}

/** 210 days so EMA-200 has enough history. */
export const HISTORY_DAYS = 210;
const MIN_POINTS = 30;

function finite(arr: unknown[]): number[] {
  return arr.filter((v): v is number => typeof v === "number" && Number.isFinite(v) && v > 0);
}

export async function fetchPriceHistory(coinId: string, fetchFn: typeof fetch = fetch): Promise<PriceHistory> {
  const universe = await getCoinUniverse(fetchFn);
  const cgId = resolveCoinId(coinId, universe);
  const { url, init } = coingeckoRequest(
    `/coins/${encodeURIComponent(cgId)}/market_chart`,
    new URLSearchParams({ vs_currency: "usd", days: String(HISTORY_DAYS), interval: "daily" }),
  );
  let res: Response;
  try {
    res = await fetchFn(url, init);
  } catch (err) {
    throw new DataFetchError("coingecko/market_chart", "network request failed", err);
  }
  if (!res.ok) throw new DataFetchError("coingecko/market_chart", `HTTP ${res.status} ${res.statusText}`);

  const json = (await res.json()) as { prices?: [number, number][]; total_volumes?: [number, number][] };
  if (!Array.isArray(json.prices)) {
    throw new DataFetchError("coingecko/market_chart", "malformed response: missing prices");
  }
  const closes = finite(json.prices.map((p) => p?.[1]));
  const volumes = Array.isArray(json.total_volumes) ? finite(json.total_volumes.map((v) => v?.[1])) : [];
  if (closes.length < MIN_POINTS) {
    throw new DataFetchError("coingecko/market_chart", `only ${closes.length} daily closes returned`);
  }
  const last = json.prices[json.prices.length - 1]?.[0] ?? Date.now();
  return { source: "coingecko/market_chart", closes, volumes: volumes.length === closes.length ? volumes : [], lastTimestamp: last };
}

type HistodayResponse = { Data?: { Data?: { time: number; close: number; volumeto: number }[] } };

export async function fetchPriceHistoryFallback(coinId: string, fetchFn: typeof fetch = fetch): Promise<PriceHistory> {
  const universe = await getCoinUniverse(fetchFn);
  const symbol = resolveSymbol(coinId, universe);
  const json = await cryptocompareGet<HistodayResponse>(
    "/v2/histoday",
    new URLSearchParams({ fsym: symbol, tsym: "USD", limit: String(HISTORY_DAYS) }),
    fetchFn,
  );
  const rows = (json.Data?.Data ?? []).filter((r) => r.close > 0);
  if (rows.length < MIN_POINTS) {
    throw new DataFetchError("cryptocompare/histoday", `only ${rows.length} daily closes returned for ${symbol}`);
  }
  return {
    source: "cryptocompare/histoday",
    closes: rows.map((r) => r.close),
    volumes: rows.map((r) => r.volumeto),
    lastTimestamp: rows[rows.length - 1]!.time * 1000,
  };
}
