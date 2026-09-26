import { DataFetchError } from "../errors";


export interface PriceData {
  asset: string;
  priceUsd: number;
  marketCapUsd: number | null;
  volume24hUsd: number | null;
  priceChangePercent24h: number | null;
  fetchedAt: number;
}

// CoinGecko's free /simple/price endpoint. The asset id must be the CoinGecko
// coin id (e.g. "bitcoin", "ethereum"), not the ticker symbol.
const COINGECKO_URL = "https://api.coingecko.com/api/v3/simple/price";

const SYMBOL_MAP: Record<string, string> = {
  btc: "bitcoin",
  bitcoin: "bitcoin",
  eth: "ethereum",
  ethereum: "ethereum",
  sol: "solana",
  solana: "solana",
};

export async function fetchPrice(
  coinId: string,
  fetchFn: typeof fetch = fetch
): Promise<PriceData> {
  const normalizedId = coinId.trim().toLowerCase();
  const cgId = SYMBOL_MAP[normalizedId] ?? normalizedId;

  const params = new URLSearchParams({
    ids: cgId,
    vs_currencies: "usd",
    include_market_cap: "true",
    include_24hr_vol: "true",
    include_24hr_change: "true",
  });

  let res: Response;
  try {
    res = await fetchFn(`${COINGECKO_URL}?${params}`);
  } catch (err) {
    throw new DataFetchError("coingecko", "network request failed", err);
  }

  if (!res.ok) {
    throw new DataFetchError(
      "coingecko",
      `HTTP ${res.status} ${res.statusText}`
    );
  }

  const json = (await res.json()) as Record<string, unknown>;
  const coin = json[cgId] as Record<string, unknown> | undefined;

  if (!coin) {
    // CoinGecko returns an empty object for unknown ids rather than a 4xx.
    throw new DataFetchError(
      "coingecko",
      `no data returned for coin id "${coinId}" — check the id is valid`
    );
  }

  const priceUsd = coin["usd"];
  if (typeof priceUsd !== "number") {
    throw new DataFetchError("coingecko", "malformed response: missing usd price");
  }

  return {
    asset: coinId,
    priceUsd,
    marketCapUsd: typeof coin["usd_market_cap"] === "number" ? coin["usd_market_cap"] : null,
    volume24hUsd: typeof coin["usd_24h_vol"] === "number" ? coin["usd_24h_vol"] : null,
    priceChangePercent24h: typeof coin["usd_24h_change"] === "number" ? coin["usd_24h_change"] : null,
    fetchedAt: Date.now(),
  };
}
