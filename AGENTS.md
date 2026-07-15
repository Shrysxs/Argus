# AGENT.md — Argus

> Production planning & agent-development spec for **Argus**, the decentralized AI Investment Syndicate (formerly the "Penguin Protocol" hackathon prototype built at Monad Blitz Pune).

This file is written to be read by both humans (you, contributors) and coding agents (Claude Code, Cursor, etc.) working on this repo. It defines what Argus is, how it's architected, what's still undecided, and the conventions any agent should follow when writing code here.

---

## 0. Status

- **Stage:** Post-hackathon → pre-production planning
- **Chain:** Not yet decided (see [Section 4](#4-chain-selection--the-abstraction-strategy))
- **Prior art:** Penguin Protocol (Monad Blitz Pune MVP) — no auth, no DB, no real portfolio/trading, single Monad-only registry contract, 5 hardcoded agents, CoinGecko + Fear & Greed data.
- **Goal of this doc:** Turn that scoped hackathon demo into an architecture that can survive real users, real money-adjacent decisions, and a chain choice made later without a rewrite.

---

## 0.5 Documentation Map

This file is the constitution — cross-cutting principles, architecture shape, roadmap. Domain specifics live in their own files so an AI agent working on one part of the stack doesn't need the whole system in context. Every doc below references shared types instead of redefining them, and lists what it owns vs. what it must never touch.

| Doc | Owns | Do not edit without reading |
|---|---|---|
| [`FRONTEND.md`](./FRONTEND.md) | `apps/web` | `ONCHAIN.md` (wallet/signing contract), `BACKEND.md` (API shape) |
| [`BACKEND.md`](./BACKEND.md) | API/orchestrator layer | `SYNDICATE.md`, `DATA.md`, `MATH.md`, `ONCHAIN.md` |
| [`ONCHAIN.md`](./ONCHAIN.md) | `contracts/`, `packages/chain-adapters` | `MATH.md` (any formula a contract enforces must match it exactly) |
| [`MATH.md`](./MATH.md) | `packages/consensus`, all pricing formulas | Nothing — this is the source of truth other docs must match |
| [`SYNDICATE.md`](./SYNDICATE.md) | `packages/agents` | `MATH.md` (vote schema the consensus engine expects) |
| [`DATA.md`](./DATA.md) | `packages/data-layer` | `MATH.md` (snapshot hash format) |

Shared types live in `packages/shared-types` and are the actual contract between all of these — if a doc's example type drifts from that package, the package wins and the doc needs updating.

---

## 1. Product Vision

Argus is an on-chain **AI investment committee**. Instead of `User → single LLM → trade`, a user gets a **syndicate of specialized agents** that independently analyze an asset using distinct, non-overlapping frameworks (value, momentum, macro, on-chain, risk), vote with a confidence score, reach a weighted consensus, and permanently seal that consensus on-chain.

The core product promise is **auditability of AI reasoning over time**: every decision, the data behind it, and each agent's track record is verifiable, not a black box.

What Argus is **not** (at least not v1):
- Not a trading bot / not custody of funds
- Not licensed investment advice — it is a decision-support and reputation-tracking tool. Any production build must carry a clear disclaimer and, depending on target jurisdictions, legal review before implying "signals" are actionable advice.

---

## 2. Core Design Principles

1. **Chain-agnostic core, chain-specific adapters.** Business logic (agents, consensus math, data ingestion) must never import a chain SDK directly.
2. **Reasoning is a first-class artifact.** Agent reasoning text, not just the vote, gets hashed and stored (on-chain hash + off-chain full text) so reasoning can't be silently rewritten after the fact.
3. **Data provenance matters.** Every consensus record should reference which data snapshot (price, F&G index, on-chain metrics) it was computed from, with a hash, so a decision can be independently re-verified.
4. **Agents are swappable, not hardcoded.** The 5 agents from the hackathon are a starting roster, not a ceiling — the architecture should support adding/removing/versioning agent "personas" without redeploying contracts.
5. **Fail loud, not silent.** If an AI provider fails, a data source is stale, or confidence is low, the system should surface that — never silently substitute a guess and present it as a clean consensus.

---

## 3. High-Level Architecture

```
┌─────────────────────┐
│   Frontend (Next.js) │  Wallet connect, syndicate UI, reputation marketplace
└──────────┬───────────┘
           │
┌──────────▼───────────┐
│   API / Orchestrator  │  Fetch data → fan out to agents → consensus → seal
│  (chain-agnostic)     │
└────┬─────────┬────────┘
     │         │
┌────▼───┐ ┌───▼──────────┐
│ Data    │ │ Agent Runner │  Calls LLM providers with per-agent framework prompts
│ Layer   │ │ (multi-model)│
└────┬───┘ └───┬──────────┘
     │         │
     │    ┌────▼─────────┐
     │    │ Consensus     │  Weighted vote aggregation (deterministic, testable)
     │    │ Engine        │
     │    └────┬──────────┘
     │         │
┌────▼─────────▼───────┐
│  Chain Adapter Layer   │  Interface implemented per-chain (see §4)
└──────────┬─────────────┘
           │
   ┌───────▼────────┐
   │  Registry        │  On-chain: decision + data hash + agent votes
   │  Contract         │
   └────────────────┘
```

Everything above the "Chain Adapter Layer" line should compile and run with **zero knowledge of which chain is in use.**

---

## 4. Chain Selection & the Abstraction Strategy

Chain is explicitly undecided. Don't let that block building. The move is:

### 4.1 Build a `ChainAdapter` interface now

```ts
interface ChainAdapter {
  chainId: number | string;
  recordDecision(input: DecisionPayload): Promise<{ txHash: string }>;
  getDecisionLogs(filter?: LogFilter): Promise<DecisionRecord[]>;
  getWalletBalance(address: string): Promise<bigint>;
  connectWallet(): Promise<WalletSession>;
  estimateFee(input: DecisionPayload): Promise<bigint>;
}
```

Any chain (Monad, an L2, Solana, whatever gets picked) implements this. The orchestrator, UI, and consensus engine only ever talk to `ChainAdapter`, never to `viem`/`web3.js`/`@solana/web3.js` directly.

### 4.2 Decision criteria to actually pick the chain later

Score candidates on:
- **Finality speed** (consensus needs to feel "sealed" fast in the UI)
- **Cost per write** at expected decision frequency (this is a high-frequency logging use case — fees compound)
- **EVM vs non-EVM** — affects whether Solidity work from the hackathon is reusable or needs a rewrite
- **Indexing/RPC maturity** — you need reliable `getLogs`-equivalent querying for the reputation marketplace
- **Ecosystem/grants fit** — if this is going to production and you want ecosystem support, distribution matters as much as tech

Keep a `docs/chain-decision.md` scratchpad to log tradeoffs as you evaluate candidates, so the final call is a paper trail, not a vibe.

### 4.3 Contract logic should stay minimal regardless of chain

The registry contract's job is: **accept a decision payload, emit an event, don't hold funds, don't gatekeep.** Keep it boring on purpose — the trust model depends on the contract being simple enough to audit in an afternoon.

---

## 5. AI Syndicate Design

### 5.1 Roster (v1, inherited from hackathon — keep, but version it)

| Agent | Framework | Bias constraint |
|---|---|---|
| Value Hunter | Graham margin-of-safety, Damodaran DCF, Buffett moat/owner-earnings | Reject speculative hype |
| Momentum Trader | RSI/MACD/EMA/VWAP, volume-confirmed breakouts | Prioritize immediate trend |
| Macro Analyst | Global M2, Fed policy, DXY, Nasdaq beta, halving cycle | Think globally/cyclically |
| On-chain Sleuth | MVRV, SOPR, exchange netflows, whale accumulation, LTH/STH | Think blockchain-first |
| Risk Guardian | Howard Marks cycles, Taleb tail-risk, Sharpe/Sortino, Kelly sizing | Stay cautious, challenge assumptions |

### 5.2 Making agents production-grade

- **Version every prompt.** Store agent prompts as versioned files (`agents/value-hunter/v1.md`), not inline strings. A decision record should log which prompt version produced it.
- **Structured output only.** Force JSON-schema-constrained output (vote, confidence, reasoning, key data points cited) from every provider. Reject and retry on schema mismatch rather than best-effort parsing.
- **Multi-provider by design, not just fallback.** The hackathon used Gemini → Groq → OpenRouter as failover. In production, consider whether some agents should always run on a specific model (e.g., a model better at quantitative reasoning for Momentum Trader) rather than treating providers as interchangeable.
- **Non-determinism control.** Low temperature for agents doing quantitative reasoning; log the seed/params used per decision for reproducibility debugging.
- **New agents should be a config change**, not a code change: define an agent as `{ id, name, framework prompt, data dependencies, model preference }` and load the roster dynamically.

### 5.3 Guardrails

- Rate-limit how often a user can trigger a full syndicate run (cost control — 5 parallel LLM calls per run adds up).
- Log every raw LLM response (even malformed ones) for auditability and debugging drift.
- Add a "disagreement flag": if agents split heavily (e.g., near 50/50 weighted), surface that prominently instead of quietly picking a winner.

---

## 6. Consensus Engine

Keep the hackathon's confidence-weighted model as the baseline — it's simple and explainable, which matters for trust:

$$W_d = \sum_{i \,:\, v_i = d} c_i \qquad \text{Recommendation} = \arg\max_d W_d \qquad \text{Confidence} = \frac{W_{\text{Recommendation}}}{\sum_d W_d} \times 100$$

Production additions to consider:
- **Reputation-weighted voting (v2):** blend an agent's historical accuracy (tracked via the reputation marketplace) into its effective weight, not just its self-reported confidence. Self-reported confidence alone is gameable by prompt drift.
- **Deterministic + unit-tested.** This function should have zero external dependencies and 100% test coverage — it's the one piece of "trust math" in the whole system.
- **Explainability payload.** Persist the full vote breakdown (not just the winner) so the UI and the on-chain hash can both reconstruct *why* a decision won.

---

## 7. Data Layer

- **Redundant sources per metric class**, not just per price feed — e.g., don't let the whole syndicate stall because one on-chain metrics API is down.
- **Snapshot + hash** every data pull that feeds a decision. Store the hash on-chain alongside the decision so a third party can verify "these agents saw this exact data."
- **Caching tier** (e.g., short-TTL cache) to avoid re-hitting rate-limited free-tier APIs (CoinGecko, Fear & Greed) on every user click.
- Plan for a paid data tier before real launch — free-tier CoinGecko/F&G limits will not survive real traffic.

---

## 8. Reputation Marketplace

- Keep event-log-derived reputation (no centralized DB dependency) as the core trust property — this was a good instinct in the hackathon version, preserve it.
- Add an indexing layer (e.g., a lightweight indexer service or subgraph-equivalent depending on chosen chain) once log volume makes live `getLogs` scanning slow — don't prematurely build this before you have real usage.
- Reputation formula should be documented and versioned publicly (same trust logic as the consensus engine — no black boxes).

---

## 9. Security & Trust Considerations (new for production, absent in hackathon MVP)

- **Contract must never custody funds.** Keep the "record-only, no fund movement" property from the MVP — this drastically shrinks the audit surface and legal exposure.
- **Key management:** the hackathon's backend-signer fallback (`MONAD_PRIVATE_KEY` style env var) is fine for a demo, not for production — move to a proper signer service / HSM / relayer pattern before real deployment.
- **Sybil / spam resistance:** decide how to prevent someone from spamming `recordDecision` calls to pollute reputation data (rate limiting, minimal fee, or requiring a connected wallet signature per call).
- **Prompt injection surface:** if any user-supplied text ever reaches an agent prompt (e.g., custom asset notes), sanitize it — agents should not be steerable by adversarial input disguised as market data.
- **Get a contract audit** before mainnet, even though the contract is intentionally minimal — "minimal" isn't the same as "risk-free."
- **Compliance/legal review** before public launch on framing decisions as "signals" — regulatory treatment of AI-generated investment content varies by jurisdiction and should be checked before wide release, not after.

---

## 10. Suggested Repository Structure

```
argus/
├── apps/
│   └── web/                  # Next.js frontend
├── packages/
│   ├── chain-adapters/       # ChainAdapter implementations, one per supported chain
│   ├── agents/                # Versioned agent prompt files + persona configs
│   ├── consensus/             # Pure, tested consensus math
│   ├── data-layer/            # Market data fetchers + caching + snapshot hashing
│   └── shared-types/          # Cross-package TypeScript types
├── contracts/                 # Solidity/other, per-chain if needed
├── docs/
│   ├── chain-decision.md
│   └── agent-prompt-changelog.md
└── AGENT.md                   # this file
```

---

## 11. Conventions for Coding Agents Working in This Repo

- **Never hardcode a chain SDK call outside `packages/chain-adapters`.** If you're an agent writing a feature and you're tempted to `import { createWalletClient } from 'viem'` in the orchestrator or UI, stop — go through `ChainAdapter`.
- **Never let the consensus engine call a network API.** It should take data in, return a decision out, nothing else.
- **All agent prompts live as files, not inline strings**, and get a version bump (not an in-place edit) when changed.
- **Every new agent persona needs:** a prompt file, a JSON schema for its output, and a unit test with at least one fixture input/output pair.
- **Don't reintroduce trading/custody logic** without an explicit product decision — this system stays "decision-support," not "execution," unless that's deliberately revisited.
- **Log, don't swallow, provider failures.** A failed agent call should show up as a visible "N/5 agents responded" state, never be silently dropped from the vote.

---

## 12. Rough Roadmap

| Phase | Scope |
|---|---|
| **0 — Hackathon (done)** | Single chain (Monad), 5 fixed agents, no persistence beyond chain logs, demo-only wallet fallback |
| **1 — Foundation** | `ChainAdapter` interface + one real implementation, versioned agent prompts, data snapshot hashing, consensus engine fully unit-tested |
| **2 — Chain decision** | Score candidates per §4.2, finalize adapter, get contract audited |
| **3 — Reputation v2** | Reputation-weighted consensus, indexer for logs, public leaderboard |
| **4 — Hardening** | Rate limiting, signer service (no raw private key env vars), legal/compliance review, paid data tier |
| **5 — Public launch** | Multi-agent roster expansion, user-facing disclaimers finalized, monitoring/alerting on agent + data + chain health |

---

## 13. Open Questions (track and resolve, don't guess silently)

- Final chain choice — and does it stay EVM (keeps Solidity work) or not?
- Monetization model — free, pay-per-decision, subscription, or protocol token?
- Does "Syndicate" stay fixed at 5 agents or become user-configurable (pick your committee)?
- How much of the reasoning text is public vs. gated?
- Target jurisdictions and the resulting disclaimer/compliance requirements?

---

*This document should evolve with the product. Update it before merging any change that alters the architecture in §3, the ChainAdapter interface in §4.1, or the consensus formula in §6 — those three are the load-bearing walls.*