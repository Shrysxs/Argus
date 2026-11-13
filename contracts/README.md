# Argus contracts

`ArgusRegistry` is the on-chain anchor for Argus decisions. It is intentionally boring:
it validates a payload, emits one event and returns. **It holds no state and no funds**
and has no owner or admin functions — small enough to audit in an afternoon.

```solidity
function recordDecision(
    string asset,               // "BTC"
    string decision,            // "BUY" | "SELL" | "HOLD"
    uint256 confidence,         // basis points, 0–10000
    bytes32 dataSnapshotHash,   // sha256(canonical(snapshot.data))
    bytes32 promptVersionHash,  // sha256 of the prompt-version commitment
    uint256 timestamp           // unix seconds
) external;

event DecisionRecorded(
    string asset, string decision, uint256 confidence,
    bytes32 dataSnapshotHash, bytes32 promptVersionHash,
    uint256 timestamp, address indexed sender
);
```

How the hashes are built and how to verify a decision end-to-end is documented on the
app's `/methodology` page and in [`../ONCHAIN.md`](../ONCHAIN.md).

## Deployments

| Network | Chain ID | Address |
|---|---|---|
| Monad testnet | 10143 | [`0x1001b9A1c69E513F7D463e3578bDeE7B94295919`](https://testnet.monadexplorer.com/address/0x1001b9A1c69E513F7D463e3578bDeE7B94295919) |

The testnet deployment was made when the contract was still named `PenguinRegistry`. The
ABI and event signature are identical; only the Solidity identifiers and revert-string
prefixes were renamed.

## Development

```bash
git submodule update --init          # forge-std
forge build
forge test -vvv
forge fmt --check
```

Deploy (keystore account, never a raw private key):

```bash
forge script script/Deploy.s.sol \
  --rpc-url https://testnet-rpc.monad.xyz \
  --account monad-deployer \
  --broadcast
```

Then set `MONAD_REGISTRY_ADDRESS` and `NEXT_PUBLIC_MONAD_REGISTRY_ADDRESS` in `apps/web/.env`.
