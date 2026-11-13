import {
  createPublicClient,
  createWalletClient,
  http,
  parseEventLogs,
  type Hex,
  type PublicClient,
} from "viem";
import { privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";
import { monadTestnet } from "viem/chains";
import type {
  DecisionPayload,
  DecisionRecord,
  LogFilter,
  VerifiedDecision,
  WalletSession,
} from "@argus/shared-types";
import type { ChainAdapter } from "./index";
import {
  DEFAULT_MONAD_REGISTRY_ADDRESS,
  MONAD_TESTNET_CHAIN_ID,
  MONAD_TESTNET_RPC_URL,
  REGISTRY_ABI,
  decisionArgs,
  encodeDecision,
} from "./registry";

export interface MonadChainAdapterConfig {
  registryAddress?: string;
  rpcUrl?: string;
  /** 0x-prefixed private key of the backend relayer. Prefer a KMS/relayer in production. */
  signerPrivateKey?: string;
  publicClient?: PublicClient;
}

const LOG_CHUNK_BLOCKS = 100n;
const DEFAULT_LOOKBACK_BLOCKS = 1_000n;

/**
 * Server-side Monad adapter (viem). Signs with a relayer key from
 * MONAD_SIGNER_PRIVATE_KEY and can independently verify any decision
 * transaction by decoding its DecisionRecorded event.
 */
export class MonadChainAdapter implements ChainAdapter {
  readonly chainId = MONAD_TESTNET_CHAIN_ID;
  readonly registryAddress: Hex;
  private readonly rpcUrl: string;
  private readonly signerKey?: string;
  private _public?: PublicClient;
  private _account?: PrivateKeyAccount;

  constructor(config: MonadChainAdapterConfig = {}) {
    this.registryAddress = (config.registryAddress ||
      process.env.MONAD_REGISTRY_ADDRESS ||
      DEFAULT_MONAD_REGISTRY_ADDRESS) as Hex;
    this.rpcUrl = config.rpcUrl || process.env.MONAD_TESTNET_RPC_URL || MONAD_TESTNET_RPC_URL;
    this.signerKey = config.signerPrivateKey ?? process.env.MONAD_SIGNER_PRIVATE_KEY;
    this._public = config.publicClient;
  }

  protected get publicClient(): PublicClient {
    this._public ??= createPublicClient({ chain: monadTestnet, transport: http(this.rpcUrl) }) as PublicClient;
    return this._public;
  }

  private get account(): PrivateKeyAccount {
    if (!this._account) {
      if (!this.signerKey || !/^0x[0-9a-fA-F]{64}$/.test(this.signerKey)) {
        throw new Error("Backend signer is not configured (MONAD_SIGNER_PRIVATE_KEY missing or invalid)");
      }
      this._account = privateKeyToAccount(this.signerKey as Hex);
    }
    return this._account;
  }

  get signerConfigured(): boolean {
    return Boolean(this.signerKey && /^0x[0-9a-fA-F]{64}$/.test(this.signerKey));
  }

  async recordDecision(input: DecisionPayload): Promise<{ txHash: string }> {
    const encoded = encodeDecision(input);
    const wallet = createWalletClient({ account: this.account, chain: monadTestnet, transport: http(this.rpcUrl) });

    let txHash: Hex;
    try {
      txHash = await wallet.writeContract({
        address: this.registryAddress,
        abi: REGISTRY_ABI,
        functionName: "recordDecision",
        args: decisionArgs(encoded),
      });
    } catch (err) {
      throw new Error(`On-chain recordDecision failed: ${err instanceof Error ? err.message : String(err)}`);
    }

    const receipt = await this.publicClient.waitForTransactionReceipt({ hash: txHash, timeout: 60_000 });
    if (receipt.status !== "success") {
      throw new Error(`On-chain transaction reverted: ${txHash}`);
    }
    return { txHash };
  }

  /**
   * Confirm that `txHash` is a successful call to the registry whose
   * DecisionRecorded event matches `expected` exactly. Throws otherwise.
   */
  async verifyDecision(txHash: string, expected: DecisionPayload): Promise<VerifiedDecision> {
    if (!/^0x[0-9a-fA-F]{64}$/.test(txHash)) throw new Error("Invalid transaction hash");
    const want = encodeDecision(expected);

    const receipt = await this.publicClient.getTransactionReceipt({ hash: txHash as Hex }).catch(() => null);
    if (!receipt) throw new Error("Transaction not found or not yet mined");
    if (receipt.status !== "success") throw new Error("Transaction reverted");

    const events = parseEventLogs({ abi: REGISTRY_ABI, logs: receipt.logs, eventName: "DecisionRecorded" }).filter(
      (l) => l.address.toLowerCase() === this.registryAddress.toLowerCase(),
    );
    const match = events.find(
      (e) =>
        e.args.asset === want.asset &&
        e.args.decision === want.decision &&
        e.args.confidence === want.confidenceBps &&
        e.args.dataSnapshotHash.toLowerCase() === want.dataSnapshotHash &&
        e.args.promptVersionHash.toLowerCase() === want.promptVersionHash &&
        e.args.timestamp === want.timestampSec,
    );
    if (!match) {
      throw new Error("Transaction does not contain a DecisionRecorded event matching this analysis");
    }
    return { txHash, sender: match.args.sender, blockNumber: receipt.blockNumber.toString() };
  }

  async getDecisionLogs(filter: LogFilter = {}): Promise<DecisionRecord[]> {
    const latest = await this.publicClient.getBlockNumber();
    const start = latest > DEFAULT_LOOKBACK_BLOCKS ? latest - DEFAULT_LOOKBACK_BLOCKS : 0n;
    const records: DecisionRecord[] = [];

    // Public Monad RPC limits eth_getLogs ranges, so scan in chunks.
    for (let from = start; from <= latest; from += LOG_CHUNK_BLOCKS) {
      const to = from + LOG_CHUNK_BLOCKS - 1n > latest ? latest : from + LOG_CHUNK_BLOCKS - 1n;
      const logs = await this.publicClient.getContractEvents({
        address: this.registryAddress,
        abi: REGISTRY_ABI,
        eventName: "DecisionRecorded",
        fromBlock: from,
        toBlock: to,
      });
      for (const log of logs) {
        const a = log.args;
        const tsMs = Number(a.timestamp) * 1000;
        if (filter.asset && a.asset !== filter.asset.toUpperCase()) continue;
        if (filter.fromTimestamp && tsMs < filter.fromTimestamp) continue;
        if (filter.toTimestamp && tsMs > filter.toTimestamp) continue;
        records.push({
          asset: a.asset!,
          timestamp: tsMs,
          consensus: {
            recommendation: a.decision as "BUY" | "SELL" | "HOLD",
            confidence: Number(a.confidence) / 100,
            breakdown: { BUY: 0, SELL: 0, HOLD: 0 },
            disagreement: false,
            agentVotes: [],
          },
          dataSnapshotHash: a.dataSnapshotHash!,
          promptVersionHash: a.promptVersionHash!,
          reasoningHash: "",
          txHash: log.transactionHash,
        });
      }
    }
    return records;
  }

  async getWalletBalance(address: string): Promise<bigint> {
    return this.publicClient.getBalance({ address: address as Hex });
  }

  async connectWallet(): Promise<WalletSession> {
    return { address: this.account.address, chainId: this.chainId };
  }

  async estimateFee(input: DecisionPayload): Promise<bigint> {
    const encoded = encodeDecision(input);
    const [gas, gasPrice] = await Promise.all([
      this.publicClient.estimateContractGas({
        address: this.registryAddress,
        abi: REGISTRY_ABI,
        functionName: "recordDecision",
        args: decisionArgs(encoded),
        account: this.account,
      }),
      this.publicClient.getGasPrice(),
    ]);
    return gas * gasPrice;
  }
}

export const monadChainAdapter = new MonadChainAdapter();
