// @argus/chain-adapters — ChainAdapter implementations, one per supported chain (see AGENTS.md §4.1).

// TODO: Define the ChainAdapter interface (recordDecision, getDecisionLogs, getWalletBalance,
// connectWallet, estimateFee) as specified in AGENTS.md §4.1.
// TODO: Implement at least one real adapter (chain TBD — see docs/chain-decision.md and AGENTS.md §4.2).
// NOTE: All chain SDK imports (viem, web3.js, @solana/web3.js, etc.) must stay inside this package —
// nothing outside chain-adapters may import a chain SDK directly (AGENTS.md §11).
export {};
