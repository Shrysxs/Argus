"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription } from "@workspace/ui/components/alert";
import { Spinner } from "@workspace/ui/components/spinner";

const input =
  "h-9 w-full rounded-sm border border-border bg-background px-3 text-sm focus:border-brass focus:outline-none";

export function AccountForms() {
  const router = useRouter();
  const [pw, setPw] = useState({ current: "", next: "" });
  const [pwState, setPwState] = useState<{ busy: boolean; error?: string; ok?: boolean }>({ busy: false });
  const [signingOut, setSigningOut] = useState(false);

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwState({ busy: true });
    const res = await fetch("/api/account/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: pw.current, newPassword: pw.next }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setPwState({ busy: false, error: data.error ?? "Could not change password" });
    setPw({ current: "", next: "" });
    setPwState({ busy: false, ok: true });
  }

  async function signOutEverywhere() {
    setSigningOut(true);
    await fetch("/api/account/sessions", { method: "DELETE" }).catch(() => {});
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <section className="rounded-md border border-border bg-surface p-5">
        <h2 className="font-serif text-lg font-bold">Change password</h2>
        <form onSubmit={changePassword} className="mt-4 space-y-3">
          <label className="block space-y-1">
            <span className="text-xs text-muted-foreground">Current password</span>
            <input type="password" autoComplete="current-password" required value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} className={input} />
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-muted-foreground">New password</span>
            <input type="password" autoComplete="new-password" required minLength={8} value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} className={input} />
            <span className="block text-[11px] text-muted-foreground">At least 8 characters with a letter and a number. Other devices will be signed out.</span>
          </label>
          {pwState.error && (
            <Alert variant="destructive">
              <AlertDescription>{pwState.error}</AlertDescription>
            </Alert>
          )}
          {pwState.ok && (
            <Alert variant="success">
              <AlertDescription>Password updated.</AlertDescription>
            </Alert>
          )}
          <button disabled={pwState.busy} className="inline-flex h-9 items-center gap-2 rounded-sm bg-foreground px-4 text-xs font-semibold text-background disabled:opacity-60">
            {pwState.busy && <Spinner className="text-background" />} Update password
          </button>
        </form>
      </section>

      <section className="rounded-md border border-border bg-surface p-5">
        <h2 className="font-serif text-lg font-bold">Sessions</h2>
        <p className="mt-1 text-xs text-muted-foreground">Signed in somewhere you don&apos;t recognize? Revoke every session at once.</p>
        <button
          type="button"
          onClick={signOutEverywhere}
          disabled={signingOut}
          className="mt-4 inline-flex h-9 items-center gap-2 rounded-sm border border-destructive/40 px-4 text-xs font-medium text-destructive hover:bg-destructive/10 disabled:opacity-60"
        >
          {signingOut && <Spinner />} Sign out everywhere
        </button>
      </section>
    </div>
  );
}
