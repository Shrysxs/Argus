"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BrowserMonadChainAdapter,
  MONAD_TESTNET_CHAIN_ID,
} from "@argus/chain-adapters/browser";

export interface WalletState {
  address: string | null;
  chainId: number | null;
  isConnecting: boolean;
  error: string | null;
  isWrongNetwork: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  switchNetwork: () => Promise<void>;
  adapter: BrowserMonadChainAdapter;
}

const defaultAdapter = new BrowserMonadChainAdapter();

export function useWallet(
  customAdapter: BrowserMonadChainAdapter = defaultAdapter
): WalletState {
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize and check existing connection
  useEffect(() => {
    if (typeof window === "undefined" || !(window as any).ethereum) return;
    const provider = (window as any).ethereum;

    let isMounted = true;

    async function checkExistingConnection() {
      try {
        const accounts: string[] = await provider.request({
          method: "eth_accounts",
        });
        if (isMounted && accounts && accounts.length > 0 && accounts[0]) {
          setAddress(accounts[0]);
          const hexChainId: string = await provider.request({
            method: "eth_chainId",
          });
          if (isMounted) {
            setChainId(parseInt(hexChainId, 16));
          }
        }
      } catch {
        // Ignore silent initialization check errors
      }
    }

    checkExistingConnection();

    const handleAccountsChanged = (accounts: string[]) => {
      if (!isMounted) return;
      if (accounts && accounts.length > 0 && accounts[0]) {
        setAddress(accounts[0]);
      } else {
        setAddress(null);
      }
    };

    const handleChainChanged = (hexChainId: string) => {
      if (!isMounted) return;
      setChainId(parseInt(hexChainId, 16));
    };

    if (provider.on) {
      provider.on("accountsChanged", handleAccountsChanged);
      provider.on("chainChanged", handleChainChanged);
    }

    return () => {
      isMounted = false;
      if (provider.removeListener) {
        provider.removeListener("accountsChanged", handleAccountsChanged);
        provider.removeListener("chainChanged", handleChainChanged);
      }
    };
  }, []);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    try {
      const session = await customAdapter.connectWallet();
      setAddress(session.address);
      setChainId(typeof session.chainId === "number" ? session.chainId : MONAD_TESTNET_CHAIN_ID);
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setIsConnecting(false);
    }
  }, [customAdapter]);

  const disconnect = useCallback(() => {
    setAddress(null);
    setChainId(null);
    setError(null);
  }, []);

  const switchNetwork = useCallback(async () => {
    setError(null);
    try {
      await customAdapter.switchNetwork();
      if (typeof window !== "undefined" && (window as any).ethereum) {
        const hexChainId: string = await (window as any).ethereum.request({
          method: "eth_chainId",
        });
        setChainId(parseInt(hexChainId, 16));
      } else {
        setChainId(MONAD_TESTNET_CHAIN_ID);
      }
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    }
  }, [customAdapter]);

  const isWrongNetwork =
    address !== null && chainId !== null && chainId !== MONAD_TESTNET_CHAIN_ID;

  return {
    address,
    chainId,
    isConnecting,
    error,
    isWrongNetwork,
    connect,
    disconnect,
    switchNetwork,
    adapter: customAdapter,
  };
}
