import { NotImplementedError } from "../errors.js";
import type { SentimentData } from "./sentiment.js";

// DATA.md §1: "at least one fallback source before production launch."
export async function fetchSentimentFallback(
  _fetchFn: typeof fetch = fetch,
): Promise<SentimentData> {
  throw new NotImplementedError("sentiment-fallback");
}
