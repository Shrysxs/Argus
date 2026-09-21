# BACKEND.md — Orchestrator & API Layer

**Owns:** the API/orchestrator (`apps/web`'s API routes, or a dedicated service if it outgrows Next.js API routes — not yet decided, start co-located).
**Talks to:** `SYNDICATE.md` (fans out agent calls), `DATA.md` (pulls snapshots), `MATH.md` (calls consensus + pricing functions — never reimplements them here), `ONCHAIN.md` (backend signer fallback + reads via `ChainAdapter`), `FRONTEND.md` (this is what the frontend calls).

This layer is glue. It should contain almost no logic of its own — every real computation is imported from a package owned by another doc. If you find yourself writing math or agent-prompt logic inline in a route handler, stop — it belongs in `packages/consensus`, `packages/agents`, or `packages/data-layer` instead.

---

## 1. Core Routes

| Route | Method | Does |
|---|---|---|
| `/api/analyze` | `POST` | Pull snapshot (`DATA.md`) → fan out to syndicate (`SYNDICATE.md`) → run consensus (`MATH.md` §1) → return result, unsealed |
| `/api/record` | `POST` | Seal a decision on-chain — client-signed path proxies to wallet, no-wallet path uses backend signer via `ChainAdapter` (`ONCHAIN.md` §1) |
| `/api/pricing/signal` | `POST` | Entropy-priced signal — calculates price via `MATH.md` §3, checks user `creditsUsd`, deducts price or returns `402 Payment Required` if balance insufficient |
| `/api/billing/balance` | `GET` | Return current logged-in user's `creditsUsd` credit balance |
| `/api/billing/topup` | `POST` | Manual/admin test grant route to add credit balance (Stripe processing is a separate future phase) |
| `/api/reputation` | `GET` | Read decision logs via `ChainAdapter.getDecisionLogs`, compute leaderboard from `MATH.md` §2 |
| `/api/auctions/bid` | `POST` | Sealed-bid submission for early-access window — reserve price from `MATH.md` §4 |
| `/api/vaults/*` | `POST` | Deposit/withdraw/status — thin proxy to the vault contract, no fee math here (lives on-chain per `ONCHAIN.md` §4) |

---

## 2. Billing & Credit Payment Enforcement (`/api/pricing/signal`)

- **Prepaid Credit System**: Every user receives a starting credit balance (`creditsUsd: 25.0`) upon registration (`isAdmin` defaults to `false`).
- **Atomic Concurrency & Anti-Double-Spend Protection**:
  - `POST /api/pricing/signal` computes `priceUsd` via pure entropy math (`MATH.md` §3).
  - Executes an **atomic conditional update** (`UPDATE users SET credits_usd = credits_usd - $price WHERE id = $id AND credits_usd >= $price` via `db.user.updateMany`):
    - **Postgres Row-Locking**: During concurrent requests, PostgreSQL acquires an exclusive write lock on the target user row and evaluates `credits_usd >= price_usd`.
    - **If `creditsUsd < priceUsd` (or row already decremented by concurrent request)**: `updateCount` returns `0`. The route returns HTTP `402 Payment Required` with `{ error, priceUsd, currentBalanceUsd, requiredTopupUsd }`. **Zero credit deduction occurs and balance NEVER drops below 0.**
    - **If `creditsUsd >= priceUsd`**: Decrements `creditsUsd` atomically (`updateCount = 1`) and returns the signal payload with `{ priceUsd, remainingCreditsUsd, paymentStatus: "paid_from_credits" }`.
- **Admin Top-Up Route (`POST /api/billing/topup`)**:
  - Strictly gated by `isAdmin === true` on the authenticated user record.
  - Returns HTTP `403 Forbidden` for non-admin users, preventing unauthorized self-grants.
  - Real payment gateway integration (Stripe/webhooks) is deliberately scoped as a separate future step.

---

## 2. Orchestration Flow (`/api/analyze`)

1. Validate asset + request.
2. `DATA.md` fetcher → `MarketDataSnapshot` (cached if fresh).
3. Fan out to all active `AgentPersona`s in parallel (`SYNDICATE.md` §1) — collect `AgentVote[]`, tolerate partial failure.
4. If fewer than a configured minimum agents responded, return a degraded-result flag — don't silently present partial consensus as full.
5. `packages/consensus` → `ConsensusResult` (`MATH.md` §1).
6. Return to frontend, unsealed. Sealing (writing to chain) is a separate, explicit user action (`/api/record`), not automatic — the user decides when to pay gas.

---

## 3. Rate Limiting & Cost Control

- Per-user limit on `/api/analyze` calls — each one fans out to 5 parallel LLM calls, real cost per hit.
- Auction and pricing endpoints (`MATH.md` §3, §4) should be cheap to compute (pure functions on already-fetched data) — these can be rate-limited more loosely than `/api/analyze`.

---

## 4. What This Layer Must Never Do

- Never call an LLM provider directly — always through `packages/agents`.
- Never fetch market data directly — always through `packages/data-layer`.
- Never implement pricing/consensus math inline — always import from `packages/consensus`.
- Never hold a user's private key beyond the documented backend-signer fallback pattern in `ONCHAIN.md` §1 — and that pattern itself needs the signer-service upgrade from `AGENT.md` §9 before real funds are involved.