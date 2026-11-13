import { DEFAULT_MONAD_REGISTRY_ADDRESS } from "@argus/chain-adapters/browser";

/** Public (browser-visible) chain settings for independent verification. */
export function publicChainConfig() {
  return {
    registryAddress:
      process.env.NEXT_PUBLIC_MONAD_REGISTRY_ADDRESS || process.env.MONAD_REGISTRY_ADDRESS || DEFAULT_MONAD_REGISTRY_ADDRESS,
    rpcUrl: process.env.NEXT_PUBLIC_MONAD_RPC_URL || "https://testnet-rpc.monad.xyz",
  };
}
