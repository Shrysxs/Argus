# Argus: Roadmap and Status

Living checklist. Update this as things ship. It is the fastest way to answer "where are we" without re-deriving it from scratch every time.

---

## Phase 0: Foundation [done]
- [x] Monorepo scaffolded, workspace structure in place
- [x] `shared-types` + `ChainAdapter` interface defined
- [x] Chain decided: Monad (testnet first)

## Phase 1: Core Logic [done]
- [x] Consensus engine. All formulas implemented, fully tested
- [x] Agent syndicate. 5 versioned prompts, schema-enforced output, multi-provider failover
- [x] Data layer. Fetchers, canonical snapshot hashing, cache, fallback seams
- [x] Monad chain adapter. Implemented, tested against stubbed ABI

## Phase 2: First Real Chain Contact [done]
- [x] Registry contract written and tested (now `ArgusRegistry`, same ABI)
- [x] Deployed to Monad testnet at `0x1001b9A1c69E513F7D463e3578bDeE7B94295919`
- [x] Relayer sealing via viem (`MONAD_SIGNER_PRIVATE_KEY`); user-wallet sealing with server-side tx verification
- [x] End-to-end run (data → agents → consensus → sealed → independently verified)

## Phase 3: Functional MVP App [done]
- [x] Persisted audit trail: snapshots (canonical bytes), every agent outcome incl. raw responses
- [x] Auth with hashed session tokens, proxy-gated routes, change password, sign out everywhere
- [x] TradingView chart on the workbench
- [x] Design system (tokens, light/dark), app shell, error/404 pages, OG image, legal pages
- [x] Public decision pages with in-browser verification; public ledger
- [x] Shared wallet connect state
- [x] SSE streaming of agent votes

## Phase 4: Reputation Marketplace [in progress]
- [x] Outcome scoring cron (7-day horizon, ±2% flat band)
- [x] Leaderboard with hit rate, Brier score and MATH.md §2 reputation index
- [ ] Reputation-weighted consensus (blend track record into vote weight)
- [ ] Indexer for on-chain logs once volume makes live scanning slow

## Phase 5: Revenue Engines
- [x] Credits in integer cents with an append-only ledger; per-run pricing with automatic refunds
- [x] Entropy-based signal value quote (read-only)
- [ ] Self-serve credit purchases (Stripe or similar)
- [ ] Sealed-bid early-access auctions (commit-reveal contract)
- [ ] Reputation bonding curves (agent tokens)
- [ ] Performance vaults. Do not start before legal review

## Phase 6: Production Hardening
- [x] Shared rate limiting via Upstash Redis (in-memory fallback for local dev)
- [x] CI: typecheck, lint, unit + integration tests on Postgres, schema drift check, build, Foundry
- [x] Health endpoint without config leakage; security headers
- [ ] On-chain metrics provider (MVRV/SOPR/netflows) so the On-chain Sleuth stops abstaining
- [ ] Signer service / KMS (replace the raw relayer key)
- [ ] Error monitoring + alerting (e.g. Sentry) and log drains
- [ ] Email verification and password reset (needs an email provider)
- [ ] Legal/compliance review of terms, privacy policy and disclaimer
- [ ] Contract audit before any mainnet deployment
- [ ] Paid market data tier

---

## Auth decisions (resolved)

1. **Auth method.** Traditional email/password. Decided.
2. **Database.** Postgres (default choice, needed now that real user accounts exist: email, password hash, later saved preferences and vault history).
3. **Session handling.** httpOnly session cookies, not JWT-in-localStorage. Avoids exposing tokens to XSS. Standard default for a server-rendered Next.js app. Flagging this as an assumption, not a hard decision. Override if you have a reason to want JWT instead.

Wallet connect (Phase 3) stays a separate concern from login. A user logs in with email/password, and can additionally connect a wallet for signing/sealing decisions. The two are not the same identity system.