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
    <header className="flex items-center justify-between px-6 py-4 md:px-10">
      <div className="flex items-center gap-6">
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight transition-opacity hover:opacity-70"
        >
          Argus
        </Link>

        {user && (
          <div className="flex items-center gap-4">
            <Link
              href="/syndicate"
              className={`text-sm font-medium transition-colors ${
                pathname === "/syndicate"
                  ? "text-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Syndicate
            </Link>
            <Link
              href="/history"
              className={`text-sm font-medium transition-colors ${
                pathname === "/history"
                  ? "text-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              History
            </Link>
          </div>
        )}
      </div>

      <nav className="flex items-center gap-4">
        {/* Wallet Connect State (Independent from user auth) */}
        <div className="flex items-center gap-2">
          {isWrongNetwork ? (
            <button
              type="button"
              onClick={switchNetwork}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-400 transition-colors hover:bg-amber-500/20"
              title="Click to switch to Monad Testnet (Chain ID 10143)"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
              Switch to Monad
            </button>
          ) : address ? (
            <div className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span className="font-mono font-medium">{truncatedAddress}</span>
              <button
                type="button"
                onClick={disconnect}
                className="ml-1 text-[10px] text-muted-foreground transition-colors hover:text-foreground"
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
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border/60 bg-card/60 px-3 text-xs font-medium text-foreground transition-all hover:border-border hover:bg-card disabled:opacity-50"
            >
              {isConnecting ? (
                <>
                  <svg
                    className="h-3 w-3 animate-spin text-[var(--accent-glow)]"
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

        {/* Existing Auth user controls */}
        {loading ? (
          <div className="h-8 w-16 animate-pulse rounded bg-card/50" />
        ) : user ? (
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">
              <span className="text-[10px]">💳</span>
              <span>${(user.creditsUsd ?? 0).toFixed(2)}</span>
            </div>
            <span className="text-xs text-muted-foreground">{user.email}</span>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg border border-border/50 bg-card/50 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-border hover:bg-card"
            >
              Log Out
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Log In
            </Link>
            <Link
              href="/signup"
              className="inline-flex h-8 items-center rounded-lg bg-[var(--accent-glow)] px-3 text-xs font-medium text-[oklch(0.15_0_0)] transition-opacity hover:opacity-90"
            >
              Sign Up
            </Link>
          </div>
        )}
      </nav>
    </header>
  );
}

