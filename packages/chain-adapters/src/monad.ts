import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type {
  DecisionPayload,
  DecisionRecord,
  LogFilter,
  WalletSession,
} from "@argus/shared-types";
import type { ChainAdapter } from "./index.js";

const execFileAsync = promisify(execFile);

export interface MonadChainAdapterConfig {
  registryAddress?: string;
  rpcUrl?: string;
  keystoreAccount?: string;
  keystorePassword?: string;
}

export class MonadChainAdapter implements ChainAdapter {
  readonly chainId = 10143; // Monad Testnet

  private registryAddress: string;
  private rpcUrl: string;
  private keystoreAccount: string;
  private keystorePassword: string;

  constructor(config: MonadChainAdapterConfig = {}) {
    this.registryAddress =
      config.registryAddress ||
      process.env.MONAD_REGISTRY_ADDRESS ||
      "0x1001b9A1c69E513F7D463e3578bDeE7B94295919";
    this.rpcUrl =
      config.rpcUrl ||
      process.env.MONAD_TESTNET_RPC_URL ||
      "https://testnet-rpc.monad.xyz";
    this.keystoreAccount =
      config.keystoreAccount || process.env.MONAD_KEYSTORE_ACCOUNT || "monad-deployer";
    this.keystorePassword =
      config.keystorePassword ?? process.env.MONAD_KEYSTORE_PASSWORD ?? "";
  }

  private formatBytes32(hash: string): string {
    let clean = hash.trim();
    if (!clean.startsWith("0x")) {
      clean = `0x${clean}`;
    }
    if (!/^0x[0-9a-fA-F]{64}$/.test(clean)) {
      throw new Error(`Invalid bytes32 hash string: ${hash}`);
    }
    return clean;
  }

  async recordDecision(input: DecisionPayload): Promise<{ txHash: string }> {
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

    const confidenceBps = Math.round(rawConf * 100);
    if (confidenceBps < 0 || confidenceBps > 10000) {
      throw new Error("Invalid payload: confidence in basis points must be 0..10000");
    }

    const dataSnapshotHash = this.formatBytes32(input.dataSnapshotHash);
    const promptVersionHash = this.formatBytes32(
      input.promptVersionHash || input.reasoningHash
    );

    const tsMs = typeof input.timestamp === "number" ? input.timestamp : Date.now();
    const timestampSec = Math.floor(tsMs > 1e11 ? tsMs / 1000 : tsMs);

    const castArgs = [
      "send",
      this.registryAddress,
      "recordDecision(string,string,uint256,bytes32,bytes32,uint256)",
      asset,
      decision,
      confidenceBps.toString(),
      dataSnapshotHash,
      promptVersionHash,
      timestampSec.toString(),
      "--rpc-url",
      this.rpcUrl,
      "--account",
      this.keystoreAccount,
      "--password",
      this.keystorePassword,
    ];

    try {
      const { stdout, stderr } = await execFileAsync("cast", castArgs);
      const output = `${stdout}\n${stderr}`;

      // Check status in receipt
      if (output.includes("status               0 (failure)") || output.includes("status               0")) {
        throw new Error(`On-chain transaction reverted: ${output}`);
      }

      const match = output.match(/transactionHash\s+(0x[0-9a-fA-F]{64})/);
      if (!match || !match[1]) {
        throw new Error(`Could not parse transaction hash from cast output:\n${output}`);
      }

      return { txHash: match[1] };
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes("On-chain transaction reverted")) {
        throw err;
      }
      const errOutput = err instanceof Error ? err.message : String(err);
      throw new Error(`On-chain recordDecision failed: ${errOutput}`);
    }
  }

  async getDecisionLogs(_filter?: LogFilter): Promise<DecisionRecord[]> {
    return [];
  }

  async getWalletBalance(address: string): Promise<bigint> {
    const { stdout } = await execFileAsync("cast", [
      "balance",
      address,
      "--rpc-url",
      this.rpcUrl,
    ]);
    return BigInt(stdout.trim());
  }

  async connectWallet(): Promise<WalletSession> {
    throw new Error("Client wallet connect is deferred — backend signer path only");
  }

  async estimateFee(_input: DecisionPayload): Promise<bigint> {
    return 100000n;
  }
}

export const monadChainAdapter = new MonadChainAdapter();
