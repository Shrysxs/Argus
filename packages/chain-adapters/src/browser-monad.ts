import type {
  DecisionPayload,
  DecisionRecord,
  LogFilter,
  WalletSession,
} from "@argus/shared-types";
import type { ChainAdapter } from "./index";
import { encodeFunctionData } from "viem";
import {
  DEFAULT_MONAD_REGISTRY_ADDRESS,
  MONAD_TESTNET_CHAIN_ID,
  MONAD_TESTNET_EXPLORER_URL,
  MONAD_TESTNET_HEX_CHAIN_ID,
  MONAD_TESTNET_RPC_URL,
  REGISTRY_ABI,
  decisionArgs,
  encodeDecision,
  explorerTxUrl,
} from "./registry";

export { createMonadPublicClient, verifyDecisionTx } from "./verify";
export {
  DEFAULT_MONAD_REGISTRY_ADDRESS,
  MONAD_TESTNET_CHAIN_ID,
  MONAD_TESTNET_EXPLORER_URL,
  MONAD_TESTNET_HEX_CHAIN_ID,
  explorerTxUrl,
};

const RECEIPT_TIMEOUT_MS = 60_000;

export interface BrowserMonadConfig {
  registryAddress?: string;
  rpcUrl?: string;
  ethereumProvider?: any;
}

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
                rpcUrls: [MONAD_TESTNET_RPC_URL],
                blockExplorerUrls: [MONAD_TESTNET_EXPLORER_URL],
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
    const encoded = encodeDecision(input);
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
      args: decisionArgs(encoded),
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

      await this.waitForReceipt(provider, txHash);
      return { txHash };
    } catch (err: any) {
      if (err?.message?.startsWith("Transaction ")) throw err;
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

  /** Wait until the wallet's RPC reports the tx mined; throw if it reverted. */
  private async waitForReceipt(provider: any, txHash: string): Promise<void> {
    const deadline = Date.now() + RECEIPT_TIMEOUT_MS;
    while (Date.now() < deadline) {
      const receipt = await provider.request({ method: "eth_getTransactionReceipt", params: [txHash] }).catch(() => null);
      if (receipt) {
        if (receipt.status !== "0x1") throw new Error(`Transaction reverted: ${explorerTxUrl(txHash)}`);
        return;
      }
      await new Promise((r) => setTimeout(r, 1500));
    }
    throw new Error(`Transaction not confirmed within ${RECEIPT_TIMEOUT_MS / 1000}s: ${explorerTxUrl(txHash)}`);
  }

  async verifyDecision(): Promise<never> {
    throw new Error("verifyDecision runs server-side via MonadChainAdapter");
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
