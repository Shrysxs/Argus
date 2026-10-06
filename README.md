# Argus — Decentralized AI Investment Syndicate

Argus is an on-chain quantitative investment committee platform. Instead of relying on a single language model or a closed trading bot, Argus orchestrates a syndicate of specialized, independent AI models that evaluate assets using distinct analytical frameworks, vote with explicit confidence metrics, reach deterministic consensus, and seal decisions immutably on-chain.

Every decision, the underlying market data snapshot, and each agent's reasoning text is cryptographically hashed and anchored on the Monad network, providing a transparent, verifiable audit trail over time.

---

## Live Demo

**Web Application:** [https://argus-web-beta.vercel.app/signup](https://argus-web-beta.vercel.app/signup)

Users can sign up, analyze supported crypto assets (BTC, ETH, SOL, LINK, DOGE), inspect the independent reasoning and data citations of all five agents, evaluate the weighted consensus recommendation, and seal the decision on the Monad testnet.

---

## Key Features

- **5-Agent Quantitative Syndicate:** Specialized agents running distinct financial frameworks (Value, Momentum, Macro, On-chain, and Risk) in parallel.
- **Deterministic Consensus Engine:** Pure, dependency-free mathematical engine aggregating confidence-weighted votes and flagging syndicate disagreements.
- **Data Provenance & Cryptographic Auditability:** Canonical SHA-256 hashing of market data snapshots, prompt versions, and agent reasoning.
- **On-Chain Sealing on Monad:** Immutable event recording (`DecisionRecorded`) on the Monad testnet registry contract.
- **Entropy-Based Signal Pricing:** Dynamic signal pricing scaled by information entropy reduction and asset volatility.
- **Concurrency-Safe Prepaid Billing:** PostgreSQL row-level locks prevent race conditions and double-spending across parallel analysis runs.
- **Multi-Provider LLM Orchestration:** Robust routing with schema-constrained JSON output validation across Groq, OpenRouter, Google Gemini, and OpenAI.

---

## The AI Syndicate Roster

Argus departs from generic prompts by enforcing strict analytical frameworks and bias constraints per agent. Prompts are versioned as markdown files in `packages/agents/prompts/` rather than hardcoded inline strings.

| Agent Persona | Framework & Philosophy | Analytical Bias Constraint | Default Model |
|---|---|---|---|
| **Value Hunter** (`value-hunter`) | Graham margin of safety, Damodaran DCF, Buffett economic moat & owner earnings | Rejects speculative hype & unbacked multiples | `openai/gpt-oss-20b` (via Groq) |
| **Momentum Trader** (`momentum-trader`) | RSI, MACD, EMA, VWAP, and volume-confirmed breakout patterns | Prioritizes immediate trend and momentum velocity | `openai/gpt-oss-20b` (via Groq) |
| **Macro Analyst** (`macro-analyst`) | Global M2 money supply, Fed rate policy, DXY, Nasdaq correlation, halving cycles | Thinks globally and cyclically across macro regimes | `openai/gpt-oss-20b` (via Groq) |
| **On-chain Sleuth** (`onchain-sleuth`) | MVRV, SOPR, exchange netflows, whale accumulation, LTH/STH cost basis | Thinks blockchain-first from transparent ledger flows | `openai/gpt-oss-20b` (via Groq) |
| **Risk Guardian** (`risk-guardian`) | Howard Marks market cycles, Taleb tail-risk distribution, Sharpe/Sortino ratios, Kelly sizing | Stays cautious, stress-tests downside risk assumptions | `openai/gpt-oss-20b` (via Groq) |

> **Single-Key Fanout:** A single LLM API key (such as a free `GROQ_API_KEY`) is all that is required to power all 5 agents concurrently. Argus fans out parallel requests across the syndicate simultaneously.

---

## How It Works

```
┌────────────────────────────────────────────────────────┐
│                   1. Market Data Layer                 │
│      Fetches live price, volume, 24h delta, F&G        │
│          Generates canonical SHA-256 snapshot          │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│               2. Parallel Syndicate Fan-Out            │
│    Value Hunter  Momentum  Macro  On-chain  Risk       │
│    5 parallel LLM inferences with schema constraints   │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│                 3. Consensus Engine                    │
│   Sums weighted confidence scores per direction:       │
│               BUY  /  SELL  /  HOLD                    │
│     Computes syndicate confidence & disagreement       │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│             4. Entropy Pricing & Billing               │
│   Calculates signal price via Shannon entropy drop     │
│   Deducts balance atomically via PostgreSQL row lock   │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│              5. On-Chain Decision Sealing              │
│   Records recommendation, confidence, snapshot hash,   │
│   and prompt version hash to Monad registry contract   │
└────────────────────────────────────────────────────────┘
```

1. **Market Data Snapshot:** Live price data (CoinGecko) and sentiment (Fear & Greed Index) are normalized into a canonical payload and hashed using SHA-256 (`packages/data-layer`).
2. **Syndicate Deliberation:** The orchestrator fans out 5 requests to the LLM runner (`packages/agents`). Each agent returns a validated JSON object with `vote`, `confidence` (0–100), `reasoning`, and `dataPointsCited`.
3. **Consensus Aggregation:** The pure math engine (`packages/consensus`) computes:
   $$\text{Weight}_d = \sum_{i : \text{vote}_i = d} \text{confidence}_i$$
   $$\text{Syndicate Confidence} = \frac{\text{Weight}_{\text{winner}}}{\sum_d \text{Weight}_d} \times 100$$
   A `disagreement` flag is raised if competing outcomes are within a narrow margin.
4. **Entropy Signal Pricing:** Signals are dynamically priced based on the information entropy of the vote distribution:
   $$H(p) = -\sum_d p_d \log_2 p_d \qquad I = \log_2(3) - H(p)$$
   High syndicate consensus yields higher information value and pricing.
5. **On-Chain Sealing:** The user can permanently anchor the decision record to the Monad testnet registry contract (`contracts/DecisionRegistry.sol`) via client wallet signing.

---

## Repository Structure

Argus is organized as a Turborepo monorepo with strict package boundaries:

```text
argus/
├── apps/
│   └── web/                  # Next.js App Router, UI components, API route handlers
├── packages/
│   ├── agents/               # Syndicate runner, agent personas & versioned prompt files
│   ├── chain-adapters/       # ChainAdapter abstraction & Monad testnet implementation
│   ├── consensus/            # Pure mathematical functions (consensus, entropy pricing)
│   ├── data-layer/           # Market data fetchers (CoinGecko, F&G) & SHA-256 snapshot hasher
│   ├── shared-types/         # Cross-package TypeScript interfaces & schemas
│   └── ui/                   # Shared UI primitives
├── contracts/                # Solidity registry contracts for Monad testnet
├── docs/                     # Specifications, architecture roadmaps & prompt changelogs
└── README.md
```

---

## API Routes Reference

All backend functionality is exposed via Next.js API routes under `apps/web/app/api`:

| Route | Method | Description |
|---|---|---|
| `/api/analyze` | `POST` | Fetches market snapshot, fans out to 5 agents, computes consensus, and stores unsealed result. |
| `/api/record` | `POST` | Seals an analysis decision on the Monad testnet registry contract. |
| `/api/pricing/signal` | `POST` | Computes entropy-based signal price and atomically deducts credits using Postgres row locks. |
| `/api/billing/balance` | `GET` | Returns current user's available USD credit balance. |
| `/api/billing/topup` | `POST` | Administrative credit grant endpoint (requires `isAdmin: true`). |
| `/api/history` | `GET` | Retrieves authenticated user's past analyses and on-chain sealing status. |
| `/api/auth/signup` | `POST` | Creates a new user account with default starting credits ($25.00). |
| `/api/auth/login` | `POST` | Authenticates user credentials and establishes a secure session cookie. |
| `/api/auth/me` | `GET` | Returns currently logged-in user profile and credit balance. |
| `/api/health` | `GET` | Liveness and health check endpoint for monitoring. |

---

## Tech Stack

- **Frontend:** Next.js (App Router), React 19, Tailwind CSS v4, Lucide Icons
- **Backend & Storage:** Next.js API Routes, Prisma ORM, Supabase (PostgreSQL)
- **Blockchain:** Solidity, Monad Testnet (RPC: `https://testnet-rpc.monad.xyz`)
- **AI Providers:** Groq, OpenRouter, Google Gemini, OpenAI (OpenAI-compatible JSON mode)
- **Monorepo Tooling:** Turborepo, npm workspaces, TypeScript

---

## Environment Setup

### 1. Prerequisites
- **Node.js:** v20+
- **npm:** v10+
- **PostgreSQL Database:** Supabase or local PostgreSQL instance
- **Web3 Wallet:** EVM wallet connected to Monad testnet

### 2. Configure Environment Variables
Copy `.env.example` to `.env` in the root directory (and in `apps/web/.env` if developing web directly):

```bash
cp .env.example .env
```

Populate the variables:

```env
# Monad Testnet Configuration
MONAD_TESTNET_RPC_URL="https://testnet-rpc.monad.xyz"
MONAD_TESTNET_DEPLOYER_ADDRESS=""
MONAD_REGISTRY_ADDRESS="0x..."

# Database & Supabase Configuration
DATABASE_URL="postgresql://user:password@localhost:5432/argus"
DIRECT_URL="postgresql://user:password@localhost:5432/argus"
NEXT_PUBLIC_SUPABASE_URL="https://your-supabase-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_URL="https://your-supabase-project.supabase.co"
SUPABASE_ANON_KEY="your-anon-key"

# LLM Provider Keys (At least one is required)
GROQ_API_KEY=""         # Recommended (free high-speed inference for open-source models)
OPENROUTER_API_KEY=""   # Optional (access to open-source models and free tier)
GEMINI_API_KEY=""       # Optional (Google AI Studio free tier)
OPENAI_API_KEY=""       # Optional (OpenAI API key)

# Web App Configuration
NEXT_PUBLIC_APP_URL="http://localhost:3000"
COOKIE_SECURE="false"   # Set to "true" in HTTPS production
```

> **Free Open-Source API Key Options:**
> - **Groq:** Free tier with high throughput on open-weight models (`openai/gpt-oss-20b`, `llama-3.3-70b-versatile`). Get a key at [console.groq.com/keys](https://console.groq.com/keys).
> - **OpenRouter:** Free access to open-weight models ending in `:free`. Get a key at [openrouter.ai/keys](https://openrouter.ai/keys).
> - **Google AI Studio:** Free tier (15 RPM / 1,500 RPD) for Gemini models. Get a key at [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey).

### 3. Install & Run Locally

```bash
# Install workspace dependencies
npm install

# Run database migrations / Prisma generation
npm run postinstall

# Start development server
npm run dev
```

The application will be running at [http://localhost:3000](http://localhost:3000).

---

## Current Status & Roadmap

### Live & Verified
- [x] 5-agent quantitative syndicate with framework prompts and output validation.
- [x] Multi-provider LLM failover and OpenAI-compatible endpoint routing.
- [x] Canonical market data snapshot hashing (SHA-256).
- [x] Monad testnet registry contract integration and client wallet signing.
- [x] Concurrency-safe PostgreSQL row-locked prepaid credit system.
- [x] End-to-end user authentication, session security, and rate limiting.

### Roadmap
- [ ] Automated log indexer for historical reputation tracking.
- [ ] Reputation-weighted consensus blending historical agent Brier scores.
- [ ] Production relayer/signer service for gasless sealing.
- [ ] External payment gateway integration (Stripe / crypto top-ups).
- [ ] Multi-chain adapter expansions (Base, Arbitrum, Solana).

---

## Origin

Argus originated as the **Penguin Protocol** prototype built during the **Monad Blitz Pune** hackathon. This repository represents the production-oriented architecture and redesign under the name **Argus**.

---

## Disclaimer

Argus is an experimental decision-support and quantitative research platform. It is not licensed financial, investment, or legal advice. The models and consensus engine can produce erroneous or hallucinated outputs. Never risk funds based solely on automated signals. You are exclusively responsible for your own financial decisions.

---

## Contact & Maintainer

Maintained by **Shreyas** ([GitHub](https://github.com/shrysxs)).