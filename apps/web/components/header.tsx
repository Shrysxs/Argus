"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";

interface AuthUser {
  id: string;
  email: string;
}

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

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

  return (
    <header className="flex items-center justify-between px-6 py-4 md:px-10">
      <div className="flex items-center gap-6">
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight transition-opacity hover:opacity-70"
        >
          Argus
        </Link>

        {user && pathname !== "/syndicate" && (
          <Link
            href="/syndicate"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Syndicate
          </Link>
        )}
      </div>

      <nav className="flex items-center gap-4">
        {loading ? (
          <div className="h-8 w-16 animate-pulse rounded bg-card/50" />
        ) : user ? (
          <div className="flex items-center gap-3">
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
