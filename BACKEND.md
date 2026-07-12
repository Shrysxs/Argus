# BACKEND.md — Orchestrator & API Layer

**Owns:** the API/orchestrator (`apps/web`'s API routes, or a dedicated service if it outgrows Next.js API routes — not yet decided, start co-located).
**Talks to:** `SYNDICATE.md` (fans out agent calls), `DATA.md` (pulls snapshots), `MATH.md` (calls consensus + pricing functions — never reimplements them here), `ONCHAIN.md` (backend signer fallback + reads via `ChainAdapter`), `FRONTEND.md` (this is what the frontend calls).

This layer is glue. It should contain almost no logic of its own — every real computation is imported from a package owned by another doc. If you find yourself writing math or agent-prompt logic inline in a route handler, stop — it belongs in `packages/consensus`, `packages/agents`, or `packages/data-layer` instead.

---

## 1. Core Routes

| Route | Does |
|---|---|
| `POST /api/analyze` | Pull snapshot (`DATA.md`) → fan out to syndicate (`SYNDICATE.md`) → run consensus (`MATH.md` §1) → return result, unsealed |
| `POST /api/record` | Seal a decision on-chain — client-signed path proxies to wallet, no-wallet path uses backend signer via `ChainAdapter` (`ONCHAIN.md` §1) |
| `GET /api/reputation` | Read decision logs via `ChainAdapter.getDecisionLogs`, compute leaderboard from `MATH.md` §2 |
| `GET /api/pricing/signal` | Entropy-priced API tier — calls `MATH.md` §3 |
| `POST /api/auctions/bid` | Sealed-bid submission for early-access window — reserve price from `MATH.md` §4 |
| `POST /api/vaults/*` | Deposit/withdraw/status — thin proxy to the vault contract, no fee math here (lives on-chain per `ONCHAIN.md` §4) |

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