// CoinGecko request helper. The keyless public API is aggressively rate
// limited from shared cloud IPs, so production should set one of:
//   COINGECKO_PRO_API_KEY  → pro-api.coingecko.com + x-cg-pro-api-key
//   COINGECKO_API_KEY      → api.coingecko.com + x-cg-demo-api-key (free "Demo" plan)
export function coingeckoRequest(path: string, params?: URLSearchParams): { url: string; init: RequestInit } {
  const pro = process.env.COINGECKO_PRO_API_KEY;
  const demo = process.env.COINGECKO_API_KEY;
  const base = pro ? "https://pro-api.coingecko.com/api/v3" : "https://api.coingecko.com/api/v3";
  const headers: Record<string, string> = { accept: "application/json" };
  if (pro) headers["x-cg-pro-api-key"] = pro;
  else if (demo) headers["x-cg-demo-api-key"] = demo;
  const qs = params ? `?${params}` : "";
  return { url: `${base}${path}${qs}`, init: { headers } };
}
