# Agent Prompt Changelog

Version history for all agent persona prompts. Every prompt change gets a version bump (not an in-place edit) — see AGENTS.md §5.2.

- **v2 (2026-09-29):** Overhauled all 5 agent prompts (`value-hunter/v2`, `momentum-trader/v2`, `macro-analyst/v2`, `onchain-sleuth/v2`, `risk-guardian/v2`) for analyst realism. Banned AI hedging fluff ("as an AI", "in conclusion", "it's important to note"), enforced mandatory citation of specific numerical data points, capped reasoning at 2–4 concise sentences, and added persona-specific few-shot examples.

- **v3 (2026-11-13):** All 5 prompts gain an explicit "Data You Receive" contract listing the exact snapshot keys each agent is given (agents now only receive their declared `dataDependencies` + `optionalDataDependencies`). Snapshots now include daily `technicals` (RSI-14, MACD, EMA-20/50/200, multi-period returns, realized volatility, drawdown, volume trend), so Momentum Trader and Risk Guardian cite real indicators instead of inferring them from a 24h change. Agents must cite ≥2 snapshot values verbatim and must not invent absent indicators (Macro Analyst is told explicitly it does not receive M2/DXY/Fed data). Momentum Trader few-shot examples rewritten around technicals. On-chain Sleuth now abstains when `onchainMetrics` is unavailable rather than guessing.
