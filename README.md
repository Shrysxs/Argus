# Argus

Argus is an on-chain quantitative investment committee platform.

## Overview

Argus orchestrates a syndicate of independent models that analyze an asset, vote with confidence scores, reach a weighted consensus, and seal the decision and its supporting data on-chain.

This architecture creates a verifiable reasoning trail. Unlike a closed trading bot, every decision is auditable. Users can inspect the exact data snapshots used, the reasoning of each agent, and the historical track record of the syndicate.

Argus is a research and educational tool. It is not financial advice, and it does not custody funds or execute trades.

## Live Demo

**URL:** [https://argus-web-beta.vercel.app/signup](https://argus-web-beta.vercel.app/signup)

Users can sign up, analyze a supported asset, view the reasoning of the five agents, and seal a consensus decision on the Monad testnet.

## How It Works

The pipeline executes in sequential stages:

1. **Market Data Snapshot:** The data layer fetches current pricing and metrics for the target asset. This data is hashed (SHA-256) to ensure the exact inputs for a decision are permanently recorded.
2. **Agent Analysis:** Five specialized agents analyze the data simultaneously. Each agent applies a distinct framework:
   * `value-hunter`: Graham margin of safety, Damodaran DCF, Buffett moat and owner earnings.
   * `momentum-trader`: RSI, MACD, EMA, VWAP, and volume confirmed breakouts.
   * `macro-analyst`: Global M2, Fed policy, DXY, Nasdaq beta, and halving cycles.
   * `onchain-sleuth`: MVRV, SOPR, exchange netflows, whale accumulation, and long term holder metrics.
   * `risk-guardian`: Howard Marks cycles, Taleb tail risk, Sharpe and Sortino ratios, and Kelly sizing.
3. **Consensus Engine:** The system calculates a weighted consensus. The recommendation is determined by the sum of confidence scores for each outcome (Buy, Sell, Hold). The overall syndicate confidence is the winning weight divided by the total weight.
4. **On-Chain Sealing:** The system records the decision, the data snapshot hash, and the prompt version hash to a registry contract on the Monad testnet.
5. **Entropy Signal Pricing:** The cost of a decision is determined by the information value of the signal. The price scales based on how much agreement exists among the agents, calculated using the entropy of the vote distribution, multiplied by the realized volatility of the asset.

## Architecture

The repository is structured as a monorepo containing the frontend, smart contracts, and independent packages.

```text
apps/
  web/              Next.js application, API layer, and orchestrator
contracts/          Solidity registry contracts for Monad
packages/
  agents/           Agent configurations and versioned framework prompts
  chain-adapters/   Chain adapter interfaces and implementations
  consensus/        Consensus math, entropy pricing, and reputation index
  data-layer/       Market data fetchers and snapshot hashing
  shared-types/     Cross-package TypeScript definitions
```

## Tech Stack

* **Frontend:** Next.js, React, Tailwind CSS
* **Backend:** Next.js API Routes, Supabase (PostgreSQL) for user data and prepaid credits
* **Chain:** Solidity, Monad testnet
* **AI Providers:** Gemini, Groq, OpenAI, OpenRouter (multi-provider with schema constrained output validation)
* **Infrastructure:** Vercel

## Current Status

**Live and Working:**
* Five agent quantitative syndicate with weighted consensus.
* Multi provider LLM routing and validation.
* Data snapshot hashing and Monad testnet anchoring.
* PostgreSQL row locked prepaid credit system.

**Not Yet Built:**
* Payment processing beyond the prepaid credit system.
* Auctions for signal access.
* Performance carry vaults.
* Agent reputation bonding curves.
* Mainnet deployment.

**Known Limitations:**
* Backend signed on chain sealing is not production ready on serverless environments. The working production path requires a client signed wallet transaction.

## Local Setup

**Prerequisites:**
* Node.js
* PostgreSQL database (e.g., Supabase)
* Monad testnet wallet

**Environment Variables:**
Copy `.env.example` to `.env` in the root directory. You must supply:
* `MONAD_TESTNET_RPC_URL` and `MONAD_REGISTRY_ADDRESS` (for on-chain sealing)
* `DATABASE_URL` and `DIRECT_URL` (for the PostgreSQL credit system)
* `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (for user authentication)
* LLM provider keys (`OPENROUTER_API_KEY`)


## Origin

Argus originated as the Penguin Protocol prototype built during the Monad Blitz Pune hackathon. This repository is the production rebuild under the name Argus.

## Disclaimer

Argus is a decision support framework built for research and educational purposes only. It is not licensed financial advice. The models and consensus engine can be wrong. You are solely responsible for your own financial decisions.

## Contact

Maintained by Shreyas ([GitHub](https://github.com/shrysxs)).