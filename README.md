# Argus: Decentralized Investment Syndicate

Argus is an on-chain quantitative investment committee platform. Instead of relying on a single LLM or closed trading bot, Argus orchestrates a syndicate of five specialized models (Value, Momentum, Macro, On-Chain, Risk) that analyze assets independently, vote with confidence scores, reach consensus, and seal decision records on-chain.

Decisions, market data snapshots, and prompt version hashes are anchored to the Monad network (`DecisionRecorded` events) for verifiable auditability over time.

---

## Features

- **5-Agent Syndicate**: Parallel analysis across Value, Momentum, Macro, On-Chain, and Risk frameworks.
- **Deterministic Consensus**: Pure mathematical engine for weighted voting, confidence aggregation, and entropy signal pricing.
- **On-Chain Sealing**: SHA-256 data snapshot and prompt version hashes anchored to Monad testnet registry contract.
- **Atomic Billing**: PostgreSQL row-locked prepaid credit system to prevent double-spending.
- **Multi-Provider LLM**: Schema-constrained output validation across Gemini, Groq, OpenAI, and OpenRouter.

---

## Workspace Architecture

```
apps/
  web/            Next.js app Router & API orchestrator
packages/
  agents/         Agent personas & versioned framework prompts
  chain-adapters/ ChainAdapter interface & Monad implementation
  consensus/      Pure consensus math & entropy pricing
  data-layer/     Market data fetchers & snapshot SHA-256 hashing
  shared-types/   Cross-package TypeScript definitions
contracts/        Solidity registry smart contracts
```

---

## Environment Setup

No environment variables are pre-configured or included by default.

Copy `.env.example` to `.env` in the root directory and supply your own keys:

```bash
cp .env.example .env
```

Required keys in `.env`:
- `MONAD_TESTNET_RPC_URL` & `MONAD_REGISTRY_ADDRESS`
- `DATABASE_URL` & `DIRECT_URL` (PostgreSQL / Supabase)
- `NEXT_PUBLIC_SUPABASE_URL` & `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `GEMINI_API_KEY`, `GROQ_API_KEY`, `OPENAI_API_KEY`, `OPENROUTER_API_KEY`

---

## Quickstart

```bash
# Install dependencies
npm install

# Start local development server
npm run dev

# Typecheck and lint
npm run typecheck
npm run lint

# Smart contract tests
cd contracts && forge test
```

---

## Disclaimer

Argus is a decision-support framework. It does not custody funds or provide licensed financial advice.