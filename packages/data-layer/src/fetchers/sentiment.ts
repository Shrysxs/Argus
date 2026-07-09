import { DataFetchError } from "../errors.js";

export interface SentimentData {
  value: number;        // 0–100: 0 = extreme fear, 100 = extreme greed
  classification: string; // e.g. "Fear", "Greed", "Neutral"
  fetchedAt: number;
}

const FEAR_GREED_URL = "https://api.alternative.me/fng/";

export async function fetchSentiment(
  fetchFn: typeof fetch = fetch
): Promise<SentimentData> {
  let res: Response;
  try {
    res = await fetchFn(`${FEAR_GREED_URL}?limit=1&format=json`);
  } catch (err) {
    throw new DataFetchError("alternative.me/fng", "network request failed", err);
  }

  if (!res.ok) {
    throw new DataFetchError(
      "alternative.me/fng",
      `HTTP ${res.status} ${res.statusText}`
    );
  }

  type FngResponse = {
    data?: Array<{ value?: string; value_classification?: string }>;
  };

  const json = (await res.json()) as FngResponse;
  const entry = json.data?.[0];

  if (!entry) {
    throw new DataFetchError("alternative.me/fng", "malformed response: missing data array");
  }

  const value = Number(entry.value);
  if (isNaN(value)) {
    throw new DataFetchError("alternative.me/fng", `malformed response: non-numeric value "${entry.value}"`);
  }

  return {
    value,
    classification: entry.value_classification ?? "Unknown",
    fetchedAt: Date.now(),
  };
}
