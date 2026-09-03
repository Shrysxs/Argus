import { NotImplementedError } from "../errors";
import type { SentimentData } from "./sentiment";


// DATA.md §1: "at least one fallback source before production launch."
export async function fetchSentimentFallback(
  _fetchFn: typeof fetch = fetch,
): Promise<SentimentData> {
  throw new NotImplementedError("sentiment-fallback");
}
