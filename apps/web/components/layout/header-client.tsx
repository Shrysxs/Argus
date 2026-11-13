"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X, Wallet, LogOut } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { useWallet } from "@/hooks/use-wallet";
import { ThemeToggle } from "@/components/theme-toggle";
import { formatUsd, shortAddress } from "@/lib/format";
import { Logo } from "./logo";

export interface HeaderUser {
  email: string;
  creditsUsd: number;
  isAdmin: boolean;
}

const PUBLIC_NAV = [
  { href: "/decisions", label: "Decisions" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/methodology", label: "Methodology" },
];
const APP_NAV = [
  { href: "/syndicate", label: "Workbench" },
  { href: "/history", label: "My history" },
];

export function HeaderClient({ user }: { user: HeaderUser | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { address, isConnecting, isWrongNetwork, connect, disconnect, switchNetwork } = useWallet();

  const nav = user ? [...APP_NAV, ...PUBLIC_NAV] : PUBLIC_NAV;

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    router.push("/login");
    router.refresh();
  }

  const walletControl = isWrongNetwork ? (
    <button
      type="button"
      onClick={switchNetwork}
      className="inline-flex h-8 items-center gap-1.5 rounded-sm border border-warning/40 bg-warning/10 px-3 font-mono text-xs text-warning"
    >
      Switch to Monad
    </button>
  ) : address ? (
    <button
      type="button"
      onClick={disconnect}
      title="Disconnect wallet"
      className="inline-flex h-8 items-center gap-1.5 rounded-sm border border-success/30 bg-success/10 px-3 font-mono text-xs text-success"
    >
      <span className="size-1.5 rounded-full bg-success" />
      {shortAddress(address)}
    </button>
  ) : (
    <button
      type="button"
      disabled={isConnecting}
      onClick={connect}
      className="inline-flex h-8 items-center gap-1.5 rounded-sm border border-border bg-surface px-3 font-mono text-xs transition-colors hover:border-brass/50 disabled:opacity-50"
    >
      <Wallet className="size-3.5" />
      {isConnecting ? "Connecting…" : "Connect wallet"}
    </button>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <Logo />
          <nav className="hidden items-center gap-5 md:flex" aria-label="Main">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "border-b-2 py-1 text-xs font-medium transition-colors",
                  pathname.startsWith(item.href)
                    ? "border-brass text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          {user && walletControl}
          <ThemeToggle />
          {user ? (
            <>
              <Link
                href="/account"
                className="inline-flex h-8 items-center gap-2 rounded-sm border border-border bg-surface px-2.5 font-mono text-xs transition-colors hover:border-brass/50"
                title={`${user.email} — account & credits`}
              >
                <span className="text-[10px] text-brass">CREDITS</span>
                <span className="tabular font-semibold">{formatUsd(user.creditsUsd)}</span>
              </Link>
              <button
                type="button"
                onClick={logout}
                className="inline-flex size-8 items-center justify-center rounded-sm border border-border bg-surface text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Log out"
                title="Log out"
              >
                <LogOut className="size-4" />
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="inline-flex h-8 items-center rounded-sm border border-border bg-surface px-3.5 text-xs font-medium hover:bg-surface-2">
                Log in
              </Link>
              <Link href="/signup" className="inline-flex h-8 items-center rounded-sm bg-foreground px-3.5 text-xs font-semibold text-background hover:bg-foreground/90">
                Get started
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex size-8 items-center justify-center rounded-sm border border-border bg-surface"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-border px-4 pb-4 md:hidden">
          <nav className="flex flex-col py-2" aria-label="Mobile">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn("py-2 text-sm", pathname.startsWith(item.href) ? "text-foreground" : "text-muted-foreground")}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
            {user ? (
              <>
                {walletControl}
                <Link href="/account" onClick={() => setOpen(false)} className="inline-flex h-8 items-center rounded-sm border border-border px-3 font-mono text-xs">
                  {formatUsd(user.creditsUsd)} credits
                </Link>
                <button type="button" onClick={logout} className="inline-flex h-8 items-center rounded-sm border border-border px-3 text-xs">
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="inline-flex h-8 items-center rounded-sm border border-border px-3 text-xs">Log in</Link>
                <Link href="/signup" className="inline-flex h-8 items-center rounded-sm bg-foreground px-3 text-xs font-semibold text-background">Get started</Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
