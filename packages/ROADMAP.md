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

## Phase 2: First Real Chain Contact [in progress]
- [x] Registry contract written, 17/17 tests passing
- [x] Contract deployed to Monad testnet. `PenguinRegistry` live at `0x1001b9A1c69E513F7D463e3578bDeE7B94295919`
- [x] Backend-signed decision sealing. `POST /api/record` live with `MonadChainAdapter` (`monad-deployer` keystore)

- [ ] End-to-end run (data -> agents -> consensus -> sealed on-chain). **Blocked**, no LLM provider key configured yet
- [x] Basic frontend shell. Landing + syndicate page, honest failure states, zero mock data

## Phase 3: Functional MVP App [next]
- [x] Backend API routes (`/api/analyze`, `/api/record`). Wires existing packages together for real
- [ ] Database persistence for unsealed analyze history in Postgres (currently analyze runs are ephemeral client roundtrips sealed on demand via `/api/record`)
- [x] Auth. Login/signup (email/password with httpOnly session cookies)
- [ ] TradingView chart embedded on the syndicate/decision screens
- [ ] Real design pass. The visual identity was left as a placeholder for the demo, needs an actual decision now that this is becoming the real app
- [ ] Decision detail page. Full vote breakdown, reasoning, on-chain link
- [ ] Wallet connect flow (real, not stubbed)

## Phase 4: Reputation Marketplace
- [ ] Reputation index computation live (Brier-score based)
- [ ] Leaderboard page, decisions feed

## Phase 5: Revenue Engines
- [ ] Entropy-priced signal API
- [ ] Sealed-bid early-access auctions (commit-reveal contract)
- [ ] Reputation bonding curves (agent tokens)
- [ ] Performance vaults. Do not start before legal review

## Phase 6: Production Hardening
- [ ] In-memory rate limiter (`apps/web/lib/auth/rate-limit.ts` live for local/MVP; needs Redis/Upstash for multi-instance production)
- [ ] Signer service (replace raw private key pattern entirely)
- [ ] Legal/compliance review
- [ ] Contract audit
- [ ] Paid data tier (free-tier limits won't survive real traffic)
- [ ] Monitoring/alerting


---

## Auth decisions (resolved)

1. **Auth method.** Traditional email/password. Decided.
2. **Database.** Postgres (default choice, needed now that real user accounts exist: email, password hash, later saved preferences and vault history).
3. **Session handling.** httpOnly session cookies, not JWT-in-localStorage. Avoids exposing tokens to XSS. Standard default for a server-rendered Next.js app. Flagging this as an assumption, not a hard decision. Override if you have a reason to want JWT instead.

Wallet connect (Phase 3) stays a separate concern from login. A user logs in with email/password, and can additionally connect a wallet for signing/sealing decisions. The two are not the same identity system.