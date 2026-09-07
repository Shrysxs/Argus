import { test, describe } from "node:test";
import assert from "node:assert/strict";
import type { DecisionPayload } from "@argus/shared-types";
import {
  BrowserMonadChainAdapter,
  MONAD_TESTNET_CHAIN_ID,
  MONAD_TESTNET_HEX_CHAIN_ID,
} from "@argus/chain-adapters";

const validBytes32Hash =
  "0x1111111111111111111111111111111111111111111111111111111111111111";

const mockPayload: DecisionPayload = {
  asset: "BTC",
  timestamp: 1700000000000,
  consensus: {
    recommendation: "BUY",
    confidence: 85.5,
    breakdown: { BUY: 85.5, SELL: 0, HOLD: 14.5 },
    disagreement: false,
    agentVotes: [],
  },
  dataSnapshotHash: validBytes32Hash,
  promptVersionHash: validBytes32Hash,
  reasoningHash: validBytes32Hash,
};

function createMockProvider(overrides: Record<string, any> = {}) {
  let currentChainId = overrides.initialChainId || MONAD_TESTNET_HEX_CHAIN_ID;
  let currentAccounts = overrides.accounts || [
    "0x6EAe111122223333444455556666777788882677",
  ];
  const txHistory: any[] = [];

  const provider = {
    txHistory,
    request: async ({ method, params }: { method: string; params?: any[] }) => {
      if (overrides.requestHandler) {
        const customResult = await overrides.requestHandler(method, params);
        if (customResult !== undefined) return customResult;
      }

      switch (method) {
        case "eth_requestAccounts":
          if (overrides.rejectAccounts) {
            throw { code: 4001, message: "User rejected connection request" };
          }
          return currentAccounts;

        case "eth_accounts":
          return currentAccounts;

        case "eth_chainId":
          return currentChainId;

        case "wallet_switchEthereumChain":
          if (overrides.rejectNetworkSwitch) {
            throw { code: 4001, message: "User rejected network switch" };
          }
          currentChainId = params?.[0]?.chainId || MONAD_TESTNET_HEX_CHAIN_ID;
          return null;

        case "wallet_addEthereumChain":
          if (overrides.rejectNetworkAdd) {
            throw { code: 4001, message: "User rejected network addition" };
          }
          currentChainId = params?.[0]?.chainId || MONAD_TESTNET_HEX_CHAIN_ID;
          return null;

        case "eth_sendTransaction":
          if (overrides.rejectTxSignature) {
            throw { code: 4001, message: "User rejected transaction signature" };
          }
          if (overrides.insufficientFunds) {
            throw { code: -32000, message: "insufficient funds for gas * price + value" };
          }
          txHistory.push(params?.[0]);
          return (
            overrides.txHash ||
            "0xe5d450f98da7c47ce05a82bc1ae23ffbb268fcc52869cc14989aaa8ebdc6d865"
          );

        case "eth_getBalance":
          return "0xDE0B6B3A7640000"; // 1 ETH/MON in hex

        case "eth_gasPrice":
          return "0x3b9aca00"; // 1 gwei

        default:
          throw new Error(`Unsupported method in mock provider: ${method}`);
      }
    },
  };

  return provider;
}

describe("Client-Side Wallet Connect & Client-Signed Sealing Suite", () => {
  test("1. Connect success: returns WalletSession with address and chainId 10143", async () => {
    const mockProvider = createMockProvider();
    const adapter = new BrowserMonadChainAdapter({ ethereumProvider: mockProvider });

    const session = await adapter.connectWallet();

    assert.strictEqual(
      session.address,
      "0x6EAe111122223333444455556666777788882677"
    );
    assert.strictEqual(session.chainId, MONAD_TESTNET_CHAIN_ID);
  });

  test("2. Connect rejection: surfaces user rejection error loud", async () => {
    const mockProvider = createMockProvider({ rejectAccounts: true });
    const adapter = new BrowserMonadChainAdapter({ ethereumProvider: mockProvider });

    await assert.rejects(
      async () => {
        await adapter.connectWallet();
      },
      (err: unknown) => {
        assert.ok(err instanceof Error);
        assert.match(err.message, /Wallet connection rejected by user/);
        return true;
      }
    );
  });

  test("3. Wrong-network prompt: triggers wallet_switchEthereumChain when on wrong chain", async () => {
    const mockProvider = createMockProvider({ initialChainId: "0x1" }); // Mainnet
    const adapter = new BrowserMonadChainAdapter({ ethereumProvider: mockProvider });

    const session = await adapter.connectWallet();

    assert.strictEqual(session.chainId, MONAD_TESTNET_CHAIN_ID);
  });

  test("4. Network switch rejection: fails explicitly when user rejects network switch", async () => {
    const mockProvider = createMockProvider({
      initialChainId: "0x1",
      rejectNetworkSwitch: true,
    });
    const adapter = new BrowserMonadChainAdapter({ ethereumProvider: mockProvider });

    await assert.rejects(
      async () => {
        await adapter.switchNetwork();
      },
      (err: unknown) => {
        assert.ok(err instanceof Error);
        assert.match(
          err.message,
          /Network switch to Monad Testnet \(Chain ID 10143\) rejected by user/
        );
        return true;
      }
    );
  });

  test("5. Client-signed tx construction: validates payload client-side before sending tx", async () => {
    const mockProvider = createMockProvider();
    const adapter = new BrowserMonadChainAdapter({ ethereumProvider: mockProvider });

    const result = await adapter.recordDecision(mockPayload);

    assert.strictEqual(
      result.txHash,
      "0xe5d450f98da7c47ce05a82bc1ae23ffbb268fcc52869cc14989aaa8ebdc6d865"
    );

    // Verify constructed transaction payload sent to provider
    assert.strictEqual(mockProvider.txHistory.length, 1);
    const sentTx = mockProvider.txHistory[0];
    assert.strictEqual(
      sentTx.from,
      "0x6EAe111122223333444455556666777788882677"
    );
    assert.strictEqual(
      sentTx.to.toLowerCase(),
      "0x1001b9a1c69e513f7d463e3578bdee7b94295919"
    );
    assert.ok(typeof sentTx.data === "string" && sentTx.data.startsWith("0x"));
  });

  test("6. Client-side sanity checks: rejects malformed payload prior to wallet prompt", async () => {
    const mockProvider = createMockProvider();
    const adapter = new BrowserMonadChainAdapter({ ethereumProvider: mockProvider });

    // Malformed bytes32 hash
    await assert.rejects(
      async () => {
        await adapter.recordDecision({
          ...mockPayload,
          dataSnapshotHash: "invalid-hash",
        });
      },
      /Invalid bytes32 hash string for dataSnapshotHash/
    );

    // Invalid confidence
    await assert.rejects(
      async () => {
        await adapter.recordDecision({
          ...mockPayload,
          consensus: {
            ...mockPayload.consensus,
            confidence: 120,
          },
        });
      },
      /confidence must be a number between 0 and 100/
    );

    // No tx was sent
    assert.strictEqual(mockProvider.txHistory.length, 0);
  });

  test("7. Transaction rejection & insufficient gas: surfaces real failure states", async () => {
    // User rejects signature
    const rejectProvider = createMockProvider({ rejectTxSignature: true });
    const rejectAdapter = new BrowserMonadChainAdapter({
      ethereumProvider: rejectProvider,
    });

    await assert.rejects(
      async () => {
        await rejectAdapter.recordDecision(mockPayload);
      },
      /Transaction signature rejected by user/
    );

    // Insufficient gas
    const gasProvider = createMockProvider({ insufficientFunds: true });
    const gasAdapter = new BrowserMonadChainAdapter({
      ethereumProvider: gasProvider,
    });

    await assert.rejects(
      async () => {
        await gasAdapter.recordDecision(mockPayload);
      },
      /Insufficient MON in wallet for gas fee/
    );
  });
});
