# Argus — Decentralized AI Investment Syndicate

Argus is an on-chain AI investment committee platform. Instead of relying on a single language model or a closed trading bot, Argus orchestrates a syndicate of specialized AI agents that independently analyze financial assets using distinct analytical frameworks, vote with explicit confidence metrics, reach deterministic consensus, and seal immutable decision records on-chain.

Every decision, the underlying market data snapshot, and each agent's reasoning text is hashed and recorded on the Monad network, providing a transparent and audit-verifiable track record over time.

---

## Key Features

- **5-Agent AI Syndicate**: Specialized agents covering Value Analysis, Momentum Trading, Macro Economics, On-Chain Sleuthing, and Risk Management.
- **Deterministic Consensus Engine**: Pure mathematical engine calculating weighted consensus recommendations, confidence metrics, and disagreement flags without external network side-effects.
- **Data Provenance & On-Chain Sealing**: SHA-256 hashing of canonical market data snapshots and prompt versions anchored to the Monad registry contract (`DecisionRecorded` events).
- **Entropy-Based Signal Pricing**: Dynamic signal pricing based on information entropy reduction \(I = H_{\text{max}} - H(p)\).
- **Atomic Credit Billing**: Prepaid credit mechanism backed by row-level PostgreSQL locks to prevent double-spending under concurrent requests.
- **Multi-Provider LLM Orchestration**: Schema-constrained output validation across Gemini, Groq, OpenAI, and OpenRouter with graceful degradation on provider failure.
- **Institutional UI**: Responsive Next.js interface featuring real-time Framer Motion agent deliberation visualizer, TradingView charts, and reputation leaderboard.

---

## Architecture Overview

Argus is structured as a monorepo powered by Turborepo and npm workspaces. The architecture strictly isolates business logic, mathematical computations, data fetching, and chain interactions into modular packages.

```
apps/
  web/                     Next.js frontend & backend API orchestrator
packages/
  agents/                  Agent personas & versioned framework prompts
  chain-adapters/          ChainAdapter interface and Monad testnet implementation
  consensus/               Pure consensus math, entropy pricing, Brier score calculations
  data-layer/              Market data fetchers, caching, and snapshot SHA-256 hashing
  shared-types/            Cross-package TypeScript type definitions
  ui/                      Shared React UI components
contracts/                 Solidity registry contracts and Foundry test suites
```

---

## How It Works

1. **Market Data Snapshot**: The Data Layer (`packages/data-layer`) aggregates market metrics (price, volume, sentiment indexes, on-chain indicators) and generates a canonical `MarketDataSnapshot` along with its SHA-256 hash.
2. **Parallel Agent Deliberation**: The Agent Layer (`packages/agents`) fans out requests across LLM providers for all active agent personas. Each agent applies its versioned framework prompt and returns schema-validated JSON containing its vote (`BUY`, `SELL`, `HOLD`), confidence score, and structured reasoning.
3. **Consensus & Pricing Computation**: The Consensus Engine (`packages/consensus`) computes:
   - Weighted recommendation \(W_d = \sum_{v_i = d} c_i\)
   - Overall confidence percentage
   - Disagreement flag if top votes are within a 10% threshold
   - Information entropy price for the signal query
4. **On-Chain Sealing**: The decision payload—including consensus outcome, confidence basis points, snapshot hash, and prompt version hash—is sealed on the Monad testnet registry contract via client-side wallet signatures or backend relayer proxies.

---

## Environment Configuration

No environment variables are pre-configured or included by default in this repository.

To run the application, you must create a `.env` file in the project root based on `.env.example` and populate your own API keys and network configuration.

### Required Environment Variables

Create `.env` in the root directory:

```bash
cp .env.example .env
```

Set the following variables in `.env`:

```env
# Monad Network Configuration
MONAD_TESTNET_RPC_URL="https://testnet-rpc.monad.xyz"
MONAD_TESTNET_DEPLOYER_ADDRESS=""
MONAD_REGISTRY_ADDRESS="0x..."

# Database & Supabase Credentials
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"
DIRECT_URL="postgresql://user:password@localhost:5432/dbname"
NEXT_PUBLIC_SUPABASE_URL="https://your-supabase-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
SUPABASE_URL="https://your-supabase-project.supabase.co"
SUPABASE_ANON_KEY="your-supabase-anon-key"

# LLM Provider API Keys
GEMINI_API_KEY="your-gemini-key"
GROQ_API_KEY="your-groq-key"
OPENAI_API_KEY="your-openai-key"
OPENROUTER_API_KEY="your-openrouter-key"
```

---

## Development Setup

### Prerequisites

- **Node.js**: version 20 or higher
- **npm**: version 11 or higher
- **Foundry**: required for compiling and testing smart contracts in `contracts/`

### Installation

Install workspace dependencies:

```bash
npm install
```

### Development Scripts

Run the development server for the web app and packages:

```bash
npm run dev
```

Build all packages and applications:

```bash
npm run build
```

Run TypeScript type-checking across all packages:

```bash
npm run typecheck
```

Run ESLint checks:

```bash
npm run lint
```

### Smart Contract Workflows

Navigate to the `contracts/` directory for contract development using Foundry:

```bash
cd contracts

# Compile smart contracts
forge build

# Execute test suite
forge test -vv
```

---

## Mathematical Foundations

### Consensus Weighting
For votes \(d \in \{\text{BUY}, \text{SELL}, \text{HOLD}\}\):

$$W_d = \sum_{i : v_i = d} c_i, \qquad \text{Recommendation} = \arg\max_d W_d$$

$$\text{Confidence} = \frac{W_{\text{Recommendation}}}{\sum_d W_d} \times 100$$

### Entropy Signal Pricing
Information gain \(I\) is calculated relative to maximum ternary entropy \(H_{\text{max}} = \log_2 3 \approx 1.585\):

$$H(p) = -\sum_d p_d \log_2 p_d, \qquad I = H_{\text{max}} - H(p)$$

$$\text{Price} = \text{BasePrice} \times \left(\frac{I}{H_{\text{max}}}\right)^\gamma \times \text{VolatilityMultiplier}$$

---

## Disclaimer

Argus is a decision-support and analytical reputation framework. It does not custody user funds or provide licensed investment advice. All signals generated represent algorithmic agent outputs based on historical data snapshots and language model reasoning.