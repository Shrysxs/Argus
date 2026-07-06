// @argus/data-layer — Market data fetchers, caching, and snapshot hashing (see AGENTS.md §7).

// TODO: Implement redundant data sources per metric class (price, on-chain, macro) per AGENTS.md §7.
// TODO: Snapshot + hash every data pull that feeds a decision, so the hash can be stored
// on-chain alongside the decision for independent verification (AGENTS.md §7).
// TODO: Add a caching tier (short-TTL) to avoid re-hitting rate-limited APIs (AGENTS.md §7).
// TODO: Plan for paid data tier before real launch — free-tier limits won't survive traffic (AGENTS.md §7).
export {};
