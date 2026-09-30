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
    <header className="border-b border-[#1E222A] bg-[#0A0B0D] px-4 py-3 sm:px-6 md:px-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="flex items-center gap-2 text-base font-serif font-bold tracking-tight text-[#F3F4F6] transition-opacity hover:opacity-90"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-sm bg-[#12141A] border border-[#B08D57]/40 text-[#B08D57] text-xs font-mono font-bold">
              A
            </span>
            <span className="font-serif tracking-wider uppercase text-sm font-semibold">ARGUS</span>
          </Link>

          {user && (
            <nav className="flex items-center gap-5">
              <Link
                href="/syndicate"
                className={`text-xs font-medium tracking-tight transition-colors py-1 ${
                  pathname === "/syndicate"
                    ? "text-[#F3F4F6] font-semibold border-b-2 border-[#B08D57]"
                    : "text-neutral-400 hover:text-[#F3F4F6]"
                }`}
              >
                Syndicate Workbench
              </Link>
              <Link
                href="/history"
                className={`text-xs font-medium tracking-tight transition-colors py-1 ${
                  pathname === "/history"
                    ? "text-[#F3F4F6] font-semibold border-b-2 border-[#B08D57]"
                    : "text-neutral-400 hover:text-[#F3F4F6]"
                }`}
              >
                Decision History
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
                className="inline-flex items-center gap-1.5 rounded-sm border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-mono text-amber-400 transition-colors hover:bg-amber-500/20"
                title="Click to switch to Monad Testnet (Chain ID 10143)"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                Switch to Monad
              </button>
            ) : address ? (
              <div className="flex items-center gap-1.5 rounded-sm border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span className="font-mono font-medium">{truncatedAddress}</span>
                <button
                  type="button"
                  onClick={disconnect}
                  className="ml-1 text-[10px] text-neutral-400 transition-colors hover:text-white"
                  title="Disconnect wallet"
                >
                  x
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={isConnecting}
                onClick={connect}
                className="inline-flex h-8 items-center gap-1.5 rounded-sm border border-[#1E222A] bg-[#12141A] px-3 text-xs font-mono text-[#F3F4F6] transition-all hover:bg-[#181A24] hover:border-[#B08D57]/40 disabled:opacity-50"
              >
                {isConnecting ? (
                  <>
                    <svg
                      className="h-3 w-3 animate-spin text-[#B08D57]"
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
                className="max-w-[150px] truncate text-[10px] text-red-400 font-mono"
                title={walletError}
              >
                {walletError}
              </span>
            )}
          </div>

          {/* User auth controls */}
          {loading ? (
            <div className="h-8 w-16 animate-pulse rounded-sm bg-[#12141A]" />
          ) : user ? (
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center gap-1.5 rounded-sm border border-[#1E222A] bg-[#12141A] px-2.5 py-1 text-xs font-mono text-[#F3F4F6]">
                <span className="text-[#B08D57] text-[10px]">USD</span>
                <span className="font-mono font-semibold">${(user.creditsUsd ?? 0).toFixed(2)}</span>
              </div>
              <span className="hidden sm:inline text-xs font-mono text-neutral-400">{user.email}</span>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-sm border border-[#1E222A] bg-[#12141A] px-3 py-1 text-xs font-medium text-neutral-300 transition-colors hover:bg-[#181A24] hover:text-[#F3F4F6]"
              >
                Log Out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="rounded-sm border border-[#1E222A] bg-[#12141A] px-3.5 py-1 text-xs font-medium text-[#F3F4F6] transition-colors hover:bg-[#181A24]"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-sm bg-[#F3F4F6] px-3.5 py-1 text-xs font-semibold text-[#0A0B0D] transition-colors hover:bg-neutral-200"
              >
                Sign up
              </Link>
            </div>
          )}
        </nav>
      </div>

      {/* Persistent Sitewide Disclaimer Line */}
      <div className="mt-2 text-center text-[10px] font-mono tracking-wider text-neutral-500 uppercase">
        Institutional Decision-Support Tool. Research & Educational Material Only.
      </div>
    </header>
  );
}

