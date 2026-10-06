# Argus

Argus is an on-chain quantitative decision platform. It runs five analytical frameworks on market data snapshots, calculates a confidence-weighted consensus, and records decisions and data hashes on Monad testnet.

---

## Live Demo

**Web Application:** [https://argus-web-beta.vercel.app/signup](https://argus-web-beta.vercel.app/signup)

Users can sign up, analyze supported assets (BTC, ETH, SOL, LINK, DOGE), view framework reasoning and citations, check consensus results, and seal decisions on Monad testnet.

---

## Features

- **5 Analytical Frameworks:** Evaluates assets across Value, Momentum, Macro, On-chain, and Risk models in parallel.
- **Deterministic Consensus:** Pure math engine aggregating confidence-weighted votes and tracking outcome distribution.
- **Cryptographic Audit Trail:** SHA-256 hashing for market snapshots, prompt versions, and output reasoning.
- **On-Chain Recording:** Anchors decision payloads to the Monad testnet registry contract (`DecisionRegistry.sol`).
- **Entropy-Based Pricing:** Signals are priced using Shannon entropy of the vote distribution and asset volatility.
- **Atomic Credit Billing:** PostgreSQL row-level locks prevent race conditions and balance overdrafts.
- **Provider Routing:** Supports Groq, OpenRouter, Google Gemini, and OpenAI with JSON schema validation.

---

## Analytical Frameworks

Prompts are stored as versioned markdown files in `packages/agents/prompts/`.

| ID | Framework | Focus | Default Model |
|---|---|---|---|
| `value-hunter` | Graham margin of safety, Damodaran DCF, Buffett moat | Fundamental value, multiples | `openai/gpt-oss-20b` (Groq) |
| `momentum-trader` | RSI, MACD, EMA, VWAP, volume breakouts | Trend confirmation, velocity | `openai/gpt-oss-20b` (Groq) |
| `macro-analyst` | Global M2, Fed policy, DXY, correlation cycles | Macro regime and liquidity | `openai/gpt-oss-20b` (Groq) |
| `onchain-sleuth` | MVRV, SOPR, exchange netflows, whale activity | Ledger flows, holder distribution | `openai/gpt-oss-20b` (Groq) |
| `risk-guardian` | Market cycles, tail risk, Sharpe ratio, Kelly sizing | Downside protection, sizing | `openai/gpt-oss-20b` (Groq) |

A single LLM API key (e.g. `GROQ_API_KEY`) runs all five evaluations in parallel.

---

## Execution Pipeline

1. **Data Snapshot:** Fetches price (CoinGecko) and sentiment (Fear & Greed Index) and generates a SHA-256 hash (`packages/data-layer`).
2. **Parallel Evaluation:** Fans out five requests with structured JSON schemas (`packages/agents`).
3. **Consensus Calculation:** Calculates weighted score:
   $$\text{Weight}_d = \sum_{i : \text{vote}_i = d} \text{confidence}_i$$
   $$\text{Confidence} = \frac{\text{Weight}_{\text{winner}}}{\sum_d \text{Weight}_d} \times 100$$
4. **Entropy Pricing:** Signal cost scales with vote consensus and asset volatility:
   $$H(p) = -\sum_d p_d \log_2 p_d \qquad I = \log_2(3) - H(p)$$
5. **On-Chain Sealing:** Writes recommendation, confidence, snapshot hash, and prompt hash to the Monad registry contract via client wallet.

---

## Repository Structure

```text
argus/
├── apps/
│   └── web/              # Next.js frontend, UI components, and API routes
├── packages/
│   ├── agents/           # Runner and versioned framework prompts
│   ├── chain-adapters/   # ChainAdapter interface and Monad implementation
│   ├── consensus/        # Consensus math and entropy pricing
│   ├── data-layer/       # Market data fetchers and SHA-256 snapshot hasher
│   ├── shared-types/     # Shared TypeScript definitions
│   └── ui/               # Shared UI primitives
├── contracts/            # Solidity registry contracts for Monad testnet
└── README.md
```

---

## API Routes

| Route | Method | Description |
|---|---|---|
| `/api/analyze` | `POST` | Fetches snapshot, runs 5 frameworks, computes consensus. |
| `/api/record` | `POST` | Records decision on Monad testnet registry contract. |
| `/api/pricing/signal` | `POST` | Computes signal price and deducts balance via PostgreSQL row lock. |
| `/api/billing/balance` | `GET` | Returns user's credit balance. |
| `/api/billing/topup` | `POST` | Admin grant route (requires `isAdmin: true`). |
| `/api/history` | `GET` | Returns user's past analyses. |
| `/api/auth/signup` | `POST` | Registers a new account ($25.00 default credit). |
| `/api/auth/login` | `POST` | Authenticates user and sets session cookie. |
| `/api/auth/me` | `GET` | Returns current user profile. |
| `/api/health` | `GET` | Service health check. |

---

## Tech Stack

- **Frontend:** Next.js (App Router), React 19, Tailwind CSS v4
- **Backend & Storage:** Next.js API Routes, Prisma ORM, Supabase (PostgreSQL)
- **Chain:** Solidity, Monad Testnet (`https://testnet-rpc.monad.xyz`)
- **LLM Providers:** Groq, OpenRouter, Google Gemini, OpenAI
- **Tooling:** Turborepo, npm workspaces, TypeScript

---

## Environment Setup

### 1. Configure Environment Variables
Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Variables:

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

# LLM Provider Keys (At least one required)
GROQ_API_KEY=""         # Free tier at console.groq.com/keys
OPENROUTER_API_KEY=""   # Free tier at openrouter.ai/keys
GEMINI_API_KEY=""       # Free tier at aistudio.google.com/app/apikey
OPENAI_API_KEY=""

# Web App Configuration
NEXT_PUBLIC_APP_URL="http://localhost:3000"
COOKIE_SECURE="false"   # Set to "true" in HTTPS production
```

### 2. Install & Run Locally

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run postinstall

# Start development server
npm run dev
```

App runs at [http://localhost:3000](http://localhost:3000).

---

## Origin

Argus originated as the Penguin Protocol prototype built during the Monad Blitz Pune hackathon.

---

## Disclaimer

Argus is an experimental decision-support tool for research purposes only. It does not provide financial or investment advice, custody funds, or execute trades.

---

## Contact

Maintained by **Shreyas** ([GitHub](https://github.com/shrysxs)).