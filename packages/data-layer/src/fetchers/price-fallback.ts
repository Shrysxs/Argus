import { DataFetchError } from "../errors";
import type { PriceData } from "./price";
import { getCoinUniverse, resolveSymbol } from "./coins";
import { cryptocompareGet, CRYPTOCOMPARE_SOURCE } from "./cryptocompare";

type FullResponse = {
  RAW?: Record<string, { USD?: { PRICE?: number; MKTCAP?: number; TOTALVOLUME24HTO?: number; CHANGEPCT24HOUR?: number } }>;
};

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** Secondary spot price source (CryptoCompare) used when CoinGecko fails. */
export async function fetchPriceFallback(coinId: string, fetchFn: typeof fetch = fetch): Promise<PriceData> {
  const universe = await getCoinUniverse(fetchFn);
  const symbol = resolveSymbol(coinId, universe);
  const json = await cryptocompareGet<FullResponse>(
    "/pricemultifull",
    new URLSearchParams({ fsyms: symbol, tsyms: "USD" }),
    fetchFn,
  );
  const usd = json.RAW?.[symbol]?.USD;
  const price = num(usd?.PRICE);
  if (!usd || price === null) {
    throw new DataFetchError(CRYPTOCOMPARE_SOURCE, `no USD price for ${symbol}`);
  }
  return {
    asset: coinId,
    priceUsd: price,
    marketCapUsd: num(usd.MKTCAP),
    volume24hUsd: num(usd.TOTALVOLUME24HTO),
    priceChangePercent24h: num(usd.CHANGEPCT24HOUR),
    fetchedAt: Date.now(),
  };
}
