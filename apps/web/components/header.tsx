"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useWallet } from "@/hooks/use-wallet";

interface AuthUser {
  id: string;
  email: string;
  creditsUsd?: number;
}

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const {
    address,
    isConnecting,
    isWrongNetwork,
    error: walletError,
    connect,
    disconnect,
    switchNetwork,
  } = useWallet();

  // Fetch current user session state from /api/auth/me
  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser, pathname]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const truncatedAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : "";

  return (
    <header className="border-b border-white/[0.08] bg-[#000000] px-4 py-3.5 sm:px-6 md:px-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-base font-bold tracking-tight text-white transition-opacity hover:opacity-80"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded bg-[#FA233B] text-white text-xs font-black">
              A
            </span>
            <span>Argus</span>
          </Link>

          {user && (
            <nav className="flex items-center gap-4">
              <Link
                href="/syndicate"
                className={`text-xs font-medium transition-colors ${
                  pathname === "/syndicate"
                    ? "text-white font-semibold"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                Syndicate
              </Link>
              <Link
                href="/history"
                className={`text-xs font-medium transition-colors ${
                  pathname === "/history"
                    ? "text-white font-semibold"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                History
              </Link>
            </nav>
          )}
        </div>

        <nav className="flex items-center gap-3">
          {/* Wallet Connect State */}
          <div className="flex items-center gap-2">
            {isWrongNetwork ? (
              <button
                type="button"
                onClick={switchNetwork}
                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-400 transition-colors hover:bg-amber-500/20"
                title="Click to switch to Monad Testnet (Chain ID 10143)"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                Switch to Monad
              </button>
            ) : address ? (
              <div className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span className="font-mono font-medium">{truncatedAddress}</span>
                <button
                  type="button"
                  onClick={disconnect}
                  className="ml-1 text-[10px] text-neutral-400 transition-colors hover:text-white"
                  title="Disconnect wallet"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={isConnecting}
                onClick={connect}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/10 bg-[#12141A] px-3 text-xs font-medium text-white transition-all hover:bg-[#1A1D26] hover:border-white/20 disabled:opacity-50"
              >
                {isConnecting ? (
                  <>
                    <svg
                      className="h-3 w-3 animate-spin text-white"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Connecting...
                  </>
                ) : (
                  "Connect Wallet"
                )}
              </button>
            )}

            {walletError && (
              <span
                className="max-w-[150px] truncate text-[10px] text-red-400"
                title={walletError}
              >
                {walletError}
              </span>
            )}
          </div>

          {/* User auth controls */}
          {loading ? (
            <div className="h-8 w-16 animate-pulse rounded bg-[#12141A]" />
          ) : user ? (
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">
                <span className="text-[10px]">💳</span>
                <span className="font-mono">${(user.creditsUsd ?? 0).toFixed(2)}</span>
              </div>
              <span className="hidden sm:inline text-xs text-neutral-400">{user.email}</span>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-lg border border-white/10 bg-[#12141A] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#1A1D26]"
              >
                Log Out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="rounded-lg border border-white/10 bg-[#12141A] px-3.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#1A1D26]"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-lg bg-white px-3.5 py-1.5 text-xs font-semibold text-black transition-colors hover:bg-neutral-200"
              >
                Sign up
              </Link>
            </div>
          )}
        </nav>
      </div>
      
      {/* Persistent Sitewide Disclaimer Line */}
      <div className="mt-2 text-center text-[10px] text-neutral-500 font-sans tracking-wide">
        Research & educational tool only — not financial advice.
      </div>
    </header>
  );
}

