# FRONTEND.md — Web App

**Owns:** `apps/web`
**Talks to:** `BACKEND.md` (all data/consensus/pricing calls go through its API — this app has no direct DB or LLM access), `ONCHAIN.md` §1 (client-side wallet connect/sign path only — uses `ChainAdapter.connectWallet` directly for the browser-wallet flow, everything else goes through the backend).

---

## 1. Stack

- Next.js (App Router), Tailwind, shadcn/ui — same base stack as your other projects, keep the tooling familiar.
- Framer Motion for the syndicate deliberation sequence (agents "thinking" in real time was a strong part of the hackathon demo — keep it, it's the moment that sells the product).
- `viem` (or whatever `ONCHAIN.md` §1 settles on) only inside the wallet-connect flow — nowhere else in this app.

**Visual Identity:** Cold Institutional Power — An old-money private bank / family office aesthetic (understated, corporate, weighty, deliberate).

- **Palette:**
  - Base background: `#0A0B0D` (Cold charcoal-graphite near-black).
  - Secondary dark tone: `#12141A` (Muted deep navy-gray for section partitions).
  - Border rules: `#1E222A` (Thin 1px sharp division rules like glass/steel partitions).
  - Single Accent: `#B08D57` (Restrained champagne brass / muted metallic). **Strict Rule:** Used ONLY for a thin rule line, small label, subtle active nav underline, or specific consensus numerals. **NEVER** as a filled button background, never glowing, max 1 accent element per screen section.
  - Primary / Secondary Text: `#F3F4F6` (Cold off-white) / `#9CA3AF` (Muted slate gray).
  - Semantic Trading Colors: BUY (`#16A34A`), SELL (`#DC2626`), HOLD (`#D97706`) — intentionally the ONLY saturated colors in the UI. All hover states, focus rings, loading indicators stay within the cold charcoal/brass/white palette (zero default blue rings or spinners).

- **Typography Pairing:**
  - **Headlines / Hero / Consensus Output:** `Newsreader` (Serif, old-money institutional gravitas).
  - **Body / UI:** `Inter` (Cold, precise sans with tight `-0.02em` letter-spacing).
  - **Data Citations & Hashes:** `JetBrains Mono` (Audit-trail monospaced dossier read).

- **Layout & Structure:**
  - Sharp 1px partition rules (`border-[#1E222A]`), no soft card shadows or glassmorphism blurs.
  - Minimal radii (`rounded-none` or `rounded-sm` max 2px, no rounded pills).
  - Formal density & deliberate negative space (private client portal / legal document feel).
  - Buttons: Solid off-white (`#F3F4F6` with black text) or outlined sharp charcoal. No brass button fills.

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