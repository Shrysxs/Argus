import type {
  DecisionPayload,
  DecisionRecord,
  LogFilter,
  WalletSession,
} from "@argus/shared-types";
import type { ChainAdapter } from "./index.js";
import { encodeFunctionData, parseAbi } from "viem";

export const MONAD_TESTNET_CHAIN_ID = 10143;
export const MONAD_TESTNET_HEX_CHAIN_ID = "0x279f";
export const DEFAULT_MONAD_REGISTRY_ADDRESS =
  "0x1001b9A1c69E513F7D463e3578bDeE7B94295919";

export interface BrowserMonadConfig {
  registryAddress?: string;
  rpcUrl?: string;
  ethereumProvider?: any;
}

const REGISTRY_ABI = parseAbi([
  "function recordDecision(string asset, string decision, uint256 confidence, bytes32 dataSnapshotHash, bytes32 promptVersionHash, uint256 timestamp) external",
]);

export class BrowserMonadChainAdapter implements ChainAdapter {
  readonly chainId = MONAD_TESTNET_CHAIN_ID;
  private registryAddress: string;
  private customProvider?: any;

  constructor(config: BrowserMonadConfig = {}) {
    this.registryAddress =
      config.registryAddress ||
      process.env.NEXT_PUBLIC_MONAD_REGISTRY_ADDRESS ||
      DEFAULT_MONAD_REGISTRY_ADDRESS;
    this.customProvider = config.ethereumProvider;
  }

  private getProvider(): any {
    if (this.customProvider) {
      return this.customProvider;
    }
    if (typeof window !== "undefined" && (window as any).ethereum) {
      return (window as any).ethereum;
    }
    throw new Error(
      "No Web3 browser wallet found. Please install MetaMask or another Monad-compatible wallet."
    );
  }

  private formatBytes32(hash: string | undefined, name: string): string {
    if (!hash) {
      throw new Error(`Invalid payload: ${name} is required`);
    }
    let clean = hash.trim();
    if (!clean.startsWith("0x")) {
      clean = `0x${clean}`;
    }
    if (!/^0x[0-9a-fA-F]{64}$/.test(clean)) {
      throw new Error(`Invalid bytes32 hash string for ${name}: ${hash}`);
    }
    return clean;
  }

  private validatePayload(input: DecisionPayload): {
    asset: string;
    decision: string;
    confidenceBps: bigint;
    dataSnapshotHash: `0x${string}`;
    promptVersionHash: `0x${string}`;
    timestampSec: bigint;
  } {
    const asset = input.asset?.trim()?.toUpperCase();
    if (!asset) {
      throw new Error("Invalid payload: asset must not be empty");
    }

    const decision = input.consensus?.recommendation;
    if (!decision || !["BUY", "SELL", "HOLD"].includes(decision)) {
      throw new Error("Invalid payload: recommendation must be BUY, SELL, or HOLD");
    }

    const rawConf = input.consensus?.confidence;
    if (typeof rawConf !== "number" || isNaN(rawConf) || rawConf < 0 || rawConf > 100) {
      throw new Error("Invalid payload: confidence must be a number between 0 and 100");
    }

    const confidenceBps = BigInt(Math.round(rawConf * 100));
    if (confidenceBps < 0n || confidenceBps > 10000n) {
      throw new Error("Invalid payload: confidence in basis points must be 0..10000");
    }

    const dataSnapshotHash = this.formatBytes32(
      input.dataSnapshotHash,
      "dataSnapshotHash"
    ) as `0x${string}`;

    const promptVersionHash = this.formatBytes32(
      input.promptVersionHash || input.reasoningHash,
      "promptVersionHash/reasoningHash"
    ) as `0x${string}`;

    const tsMs = typeof input.timestamp === "number" ? input.timestamp : Date.now();
    const timestampSec = BigInt(Math.floor(tsMs > 1e11 ? tsMs / 1000 : tsMs));

    return {
      asset,
      decision,
      confidenceBps,
      dataSnapshotHash,
      promptVersionHash,
      timestampSec,
    };
  }

  async switchNetwork(): Promise<void> {
    const provider = this.getProvider();
    try {
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: MONAD_TESTNET_HEX_CHAIN_ID }],
      });
    } catch (err: any) {
      // 4902 error code means the chain has not been added to MetaMask
      if (err?.code === 4902 || err?.message?.includes("Unrecognized chain ID")) {
        try {
          await provider.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: MONAD_TESTNET_HEX_CHAIN_ID,
                chainName: "Monad Testnet",
                nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
                rpcUrls: ["https://testnet-rpc.monad.xyz"],
                blockExplorerUrls: ["https://testnet.monadexplorer.com"],
              },
            ],
          });
          return;
        } catch (addErr: any) {
          if (addErr?.code === 4001 || addErr?.message?.includes("user rejected")) {
            throw new Error("Adding Monad Testnet rejected by user.");
          }
          throw new Error(`Failed to add Monad Testnet to wallet: ${addErr?.message || String(addErr)}`);
        }
      }

      if (err?.code === 4001 || err?.message?.includes("user rejected")) {
        throw new Error("Network switch to Monad Testnet (Chain ID 10143) rejected by user.");
      }

      throw new Error(`Failed to switch network to Monad Testnet: ${err?.message || String(err)}`);
    }
  }

  async connectWallet(): Promise<WalletSession> {
    const provider = this.getProvider();

    let accounts: string[] = [];
    try {
      accounts = await provider.request({ method: "eth_requestAccounts" });
    } catch (err: any) {
      if (err?.code === 4001 || err?.message?.includes("user rejected")) {
        throw new Error("Wallet connection rejected by user.");
      }
      throw new Error(`Wallet connection failed: ${err?.message || String(err)}`);
    }

    if (!accounts || accounts.length === 0 || !accounts[0]) {
      throw new Error("No accounts found in connected wallet.");
    }

    // Verify chain ID
    let hexChainId = await provider.request({ method: "eth_chainId" });
    let currentChainId = parseInt(hexChainId, 16);

    if (currentChainId !== MONAD_TESTNET_CHAIN_ID) {
      await this.switchNetwork();
      hexChainId = await provider.request({ method: "eth_chainId" });
      currentChainId = parseInt(hexChainId, 16);
    }

    return {
      address: accounts[0],
      chainId: currentChainId,
    };
  }

  async recordDecision(input: DecisionPayload): Promise<{ txHash: string }> {
    const validated = this.validatePayload(input);
    const provider = this.getProvider();

    // Check chain ID before tx
    const hexChainId = await provider.request({ method: "eth_chainId" });
    const currentChainId = parseInt(hexChainId, 16);
    if (currentChainId !== MONAD_TESTNET_CHAIN_ID) {
      await this.switchNetwork();
    }

    let accounts: string[] = await provider.request({ method: "eth_accounts" });
    if (!accounts || accounts.length === 0) {
      accounts = await provider.request({ method: "eth_requestAccounts" });
    }

    const fromAddress = accounts[0];
    if (!fromAddress) {
      throw new Error("No wallet account available to sign transaction.");
    }

    const calldata = encodeFunctionData({
      abi: REGISTRY_ABI,
      functionName: "recordDecision",
      args: [
        validated.asset,
        validated.decision,
        validated.confidenceBps,
        validated.dataSnapshotHash,
        validated.promptVersionHash,
        validated.timestampSec,
      ],
    });

    try {
      const txHash: string = await provider.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: fromAddress,
            to: this.registryAddress,
            data: calldata,
          },
        ],
      });

      if (!txHash || !/^0x[0-9a-fA-F]{64}$/.test(txHash)) {
        throw new Error(`Invalid transaction hash returned from wallet: ${txHash}`);
      }

      return { txHash };
    } catch (err: any) {
      if (err?.code === 4001 || err?.message?.includes("user rejected") || err?.message?.includes("User denied")) {
        throw new Error("Transaction signature rejected by user.");
      }
      if (
        err?.code === -32000 ||
        err?.message?.includes("insufficient funds") ||
        err?.message?.includes("exceeds balance")
      ) {
        throw new Error("Insufficient MON in wallet for gas fee.");
      }
      throw new Error(`Client-signed transaction failed: ${err?.message || String(err)}`);
    }
  }

  async getDecisionLogs(_filter?: LogFilter): Promise<DecisionRecord[]> {
    return [];
  }

  async getWalletBalance(address: string): Promise<bigint> {
    const provider = this.getProvider();
    const hexBalance: string = await provider.request({
      method: "eth_getBalance",
      params: [address, "latest"],
    });
    return BigInt(hexBalance || "0x0");
  }

  async estimateFee(_input: DecisionPayload): Promise<bigint> {
    try {
      const provider = this.getProvider();
      const gasPriceHex: string = await provider.request({ method: "eth_gasPrice" });
      const gasPrice = BigInt(gasPriceHex || "0x3b9aca00"); // default 1 gwei
      const estimatedGas = 100000n; // typical recordDecision execution gas
      return gasPrice * estimatedGas;
    } catch {
      return 100000000000000n; // fallback ~0.0001 MON
    }
  }
}

export const browserMonadChainAdapter = new BrowserMonadChainAdapter();
