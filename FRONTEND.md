# FRONTEND.md — Web App

**Owns:** `apps/web`
**Talks to:** `BACKEND.md` (all data/consensus/pricing calls go through its API — this app has no direct DB or LLM access), `ONCHAIN.md` §1 (client-side wallet connect/sign path only — uses `ChainAdapter.connectWallet` directly for the browser-wallet flow, everything else goes through the backend).

---

## 1. Stack

- Next.js (App Router), Tailwind, shadcn/ui — same base stack as your other projects, keep the tooling familiar.
- Framer Motion for the syndicate deliberation sequence (agents "thinking" in real time was a strong part of the hackathon demo — keep it, it's the moment that sells the product).
- `viem` (or whatever `ONCHAIN.md` §1 settles on) only inside the wallet-connect flow — nowhere else in this app.

**Open decision, not yet made:** visual identity. The hackathon version was dark-mode-only with purple accents; your portfolio site runs mono black-and-white. Argus probably wants its own identity rather than inheriting either by default — flagging this as a decision to make deliberately, not inheriting silently.

---

## 2. Pages (v1)

| Route | Purpose |
|---|---|
| `/` | Landing — the pitch, the teaser copy, "Launch Demo" |
| `/syndicate` | Select asset, trigger `/api/analyze`, watch the 5-agent deliberation animate in |
| `/decision/[id]` | Full detail on one sealed decision — votes, reasoning, data snapshot hash, on-chain link |
| `/marketplace` | Reputation leaderboard — reads `/api/reputation` |
| `/vaults` | Vault dashboard (v1 read-only status, deposit/withdraw once `ONCHAIN.md` §4 ships and is legally cleared) |
| `/pricing` | Entry point for the entropy-priced API + auction tiers — this is where whales actually convert |

---

## 3. Data Flow

1. UI calls `BACKEND.md`'s `/api/analyze` — never touches `packages/agents`, `packages/consensus`, or `packages/data-layer` directly.
2. Consensus result renders unsealed first (per `BACKEND.md` §2 step 6) — sealing is an explicit user action, a separate button/flow, with the wallet-connect path handled client-side via `ChainAdapter`.
3. Reputation, pricing, and auction views are read-heavy — safe to cache client-side more aggressively than the analyze flow.

---

## 4. What This App Must Never Do

- Never call an LLM provider or hold an API key for one.
- Never compute consensus, pricing, or reputation math client-side — always trust the backend's computed result, don't recompute for "instant" UI (that's how client and chain state drift).
- Never store a private key or signer beyond the standard browser wallet extension flow.