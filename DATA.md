# DATA.md — Market Data Layer

**Owns:** `packages/data-layer`
**Talks to:** `MATH.md` (snapshot hash format must match what `ONCHAIN.md` records on-chain), `SYNDICATE.md` (agents consume `MarketDataSnapshot`, never fetch directly).

---

## 1. Sources

- Price data (CoinGecko-class provider)
- Sentiment index (Fear & Greed-class provider)
- On-chain metrics (MVRV, SOPR, netflows, whale scores) for `onchain-sleuth` — needs a dedicated provider, not yet selected; log the decision in `docs/chain-decision.md`-style scratchpad once picked.

Each metric class should have at least one fallback source before production launch — don't let the whole syndicate stall because one free-tier API is down.

---

## 2. Snapshot + Hash

Every fetch that feeds a decision produces a `MarketDataSnapshot`:

```ts
interface MarketDataSnapshot {
  fetchedAt: number;
  fields: Record<string, number | string>;
  hash: string; // sha256 of the canonically-serialized fields
}
```

The hash gets recorded on-chain alongside the decision (`ONCHAIN.md` §2) so any third party can pull the same raw values and reproduce the exact hash — that's the actual verifiability claim of the product, don't let this drift into a formality nobody checks.

---

## 3. Caching

Short-TTL in-memory cache in front of every fetcher (start simple — a map with expiry, no external cache dependency until volume demands it). This exists purely to survive free-tier rate limits, not as a correctness mechanism — never serve stale-past-TTL data silently.

---

## 4. Failure Handling

Per `AGENT.md` §2 (fail loud, not silent): a failed or stale fetch throws or returns a clearly-typed error result. Never substitute a default/last-known value and present it as fresh — if `onchain-sleuth`'s data source is down, that agent's round should show as degraded (see `SYNDICATE.md` §5), not silently run on stale numbers.

---

## 5. Production Note

Free-tier CoinGecko/Fear-&-Greed limits will not survive real traffic — budget for a paid tier before public launch, not after you hit the wall.