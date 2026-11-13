import { DataFetchError } from "../errors";

// CryptoCompare (CoinDesk Data) min-api. Keyless access is rate limited;
// set CRYPTOCOMPARE_API_KEY for production.
const BASE = "https://min-api.cryptocompare.com/data";
export const CRYPTOCOMPARE_SOURCE = "cryptocompare";

export async function cryptocompareGet<T>(path: string, params: URLSearchParams, fetchFn: typeof fetch): Promise<T> {
  const headers: Record<string, string> = { accept: "application/json" };
  if (process.env.CRYPTOCOMPARE_API_KEY) headers.authorization = `Apikey ${process.env.CRYPTOCOMPARE_API_KEY}`;
  let res: Response;
  try {
    res = await fetchFn(`${BASE}${path}?${params}`, { headers });
  } catch (err) {
    throw new DataFetchError(CRYPTOCOMPARE_SOURCE, "network request failed", err);
  }
  if (!res.ok) throw new DataFetchError(CRYPTOCOMPARE_SOURCE, `HTTP ${res.status} ${res.statusText}`);
  const json = (await res.json()) as T & { Response?: string; Message?: string };
  if (json && json.Response === "Error") {
    throw new DataFetchError(CRYPTOCOMPARE_SOURCE, json.Message || "error response");
  }
  return json;
}
