# ONCHAIN.md — Contracts & Chain Adapter

**Owns:** `contracts/`, `packages/chain-adapters`
**Talks to:** `MATH.md` (any formula enforced on-chain — vault fees, bonding curve pricing — must match that doc exactly, no drift), `BACKEND.md` (backend signer fallback path), `FRONTEND.md` (client-side wallet signing path).

**Chain: Monad** (decided — see rationale log; EVM-compatible, ~400ms finality, live mainnet since Nov 2025). Chain-specific code stays isolated here; nothing outside this doc's packages should import a chain SDK directly (`AGENT.md` §11).

---

## 1. `ChainAdapter` Interface

```ts
interface ChainAdapter {
  chainId: number;
  recordDecision(input: DecisionPayload): Promise<{ txHash: string }>;
  getDecisionLogs(filter?: LogFilter): Promise<DecisionRecord[]>;
  getWalletBalance(address: string): Promise<bigint>;
  connectWallet(): Promise<WalletSession>;
  estimateFee(input: DecisionPayload): Promise<bigint>;
}
```

Implemented once, for Monad, in `packages/chain-adapters`. Types come from `packages/shared-types`, not redefined here.

---

## 2. Registry Contract

Minimal, record-only, never custodies funds (`AGENT.md` §9). Extends the hackathon `PenguinRegistry.sol` pattern:

```solidity
event DecisionRecorded(
    string asset,
    string decision,
    uint256 confidence,
    bytes32 dataSnapshotHash,   // ties to DATA.md §2
    uint256 promptVersionHash,  // ties to SYNDICATE.md §2
    uint256 timestamp,
    address indexed sender
);

function recordDecision(
    string calldata asset,
    string calldata decision,
    uint256 confidence,
    bytes32 dataSnapshotHash,
    uint256 promptVersionHash,
    uint256 timestamp
) external;
```

Two additions vs. the hackathon version: the data snapshot hash and prompt version are now part of the on-chain record, because the verifiability claim in `DATA.md` §2 only means something if it's actually anchored on-chain, not just computed and discarded.

---

## 3. Commit-Reveal (for early-access auctions, per `REVENUE-MODEL.md` §2)

1. `commitDecision(bytes32 decisionHash)` — internal consensus result committed, not yet public.
2. Sealed-bid auction window runs off-chain or via a dedicated auction contract; winners determined by clearing price logic from `MATH.md` §4.
3. `revealDecision(...)` — same fields as `recordDecision` above, called once the window closes, emits the same `DecisionRecorded` event. This is what makes the decision public.

Keep the auction contract separate from the registry — the registry's job stays "record and emit," full stop. Auction settlement logic (who won, what they paid) is a distinct contract with distinct risk (holds bid funds briefly), and should be scoped and audited separately.

---

## 4. Vault Contract (do not build before legal review — `AGENT.md` §12 Phase 4)

Needs: deposit/withdraw, per-vault confidence threshold config, high-water-mark tracker enforcing `MATH.md` §6 exactly, and a clear non-custodial exit path for depositors at all times. This is the one contract in the whole system that holds real user funds — treat it accordingly.

---

## 5. Bonding Curve Contract (agent reputation tokens, `REVENUE-MODEL.md` §4)

Implements `MATH.md` §5 exactly: `P_0` and `k` immutable at deploy time, no admin function to alter curve slope post-launch. Reputation input `R_i(t)` is read from an oracle/updater that pulls from the reputation index computation (owned in `MATH.md` §2) — don't let the contract recompute Brier scores itself; it should just consume the number.

---

## 6. Deployment

Foundry, same pattern as the hackathon (`forge build`, `forge test -vv`, `forge script ... --broadcast`). Verify on Monad's block explorer post-deploy. Every new contract gets a test suite before deployment — no exceptions, this is the layer where bugs are the most expensive.