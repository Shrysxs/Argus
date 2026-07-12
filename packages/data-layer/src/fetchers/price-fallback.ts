import { NotImplementedError } from "../errors.js";
import type { PriceData } from "./price.js";

// DATA.md §1: "at least one fallback source before production launch."
// Seam exists so a second price provider can be dropped in without
// restructuring the snapshot orchestrator.
export async function fetchPriceFallback(
  _coinId: string,
  _fetchFn: typeof fetch = fetch,
): Promise<PriceData> {
  throw new NotImplementedError("price-fallback");
}
