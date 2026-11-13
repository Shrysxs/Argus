"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, ShieldCheck } from "lucide-react";
import type { DecisionPayload } from "@argus/shared-types";
import { explorerTxUrl } from "@argus/chain-adapters/browser";
import { Spinner } from "@workspace/ui/components/spinner";
import { useWallet } from "@/hooks/use-wallet";
import { sealAnalysis } from "@/lib/api";
import { shortAddress, shortHash } from "@/lib/format";

type Mode = "wallet" | "relayer";

export function SealPanel({ analysisId, payload }: { analysisId: string; payload: DecisionPayload }) {
  const { address, isWrongNetwork, connect, switchNetwork, adapter } = useWallet();
  const [mode, setMode] = useState<Mode>(address ? "wallet" : "relayer");
  const [busy, setBusy] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function seal() {
    setError(null);
    try {
      if (mode === "wallet") {
        if (!address) return void (await connect());
        if (isWrongNetwork) return void (await switchNetwork());
        setBusy("Confirm in your wallet…");
        const { txHash: hash } = await adapter.recordDecision(payload);
        setBusy("Verifying on-chain…");
        await sealAnalysis(analysisId, hash);
        setTxHash(hash);
        router.refresh();
      } else {
        setBusy("Submitting via relayer…");
        const res = await sealAnalysis(analysisId);
        setTxHash(res.txHash);
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sealing failed");
    } finally {
      setBusy(null);
    }
  }

  if (txHash) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-sm border border-success/30 bg-success/10 px-3 py-2 text-xs text-success">
        <span className="inline-flex items-center gap-1.5 font-medium">
          <ShieldCheck className="size-4" /> Sealed on Monad testnet
        </span>
        <a href={explorerTxUrl(txHash)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-mono underline">
          {shortHash(txHash)} <ExternalLink className="size-3" />
        </a>
      </div>
    );
  }

  const label =
    mode === "wallet"
      ? !address
        ? "Connect wallet to seal"
        : isWrongNetwork
          ? "Switch to Monad testnet"
          : "Seal with my wallet"
      : "Seal via Argus relayer";

  return (
    <div className="space-y-2.5">
      <fieldset className="grid grid-cols-2 gap-2" aria-label="Signer">
        {(
          [
            ["wallet", "Your wallet", address ? shortAddress(address) : "You pay gas · you are the signer"],
            ["relayer", "Argus relayer", "No gas · signed by Argus"],
          ] as const
        ).map(([value, title, sub]) => (
          <label
            key={value}
            className={`cursor-pointer rounded-sm border px-3 py-2 text-xs transition-colors ${
              mode === value ? "border-brass bg-surface-2" : "border-border hover:border-brass/40"
            }`}
          >
            <input type="radio" name="signer" value={value} checked={mode === value} onChange={() => setMode(value)} className="sr-only" />
            <span className="block font-medium">{title}</span>
            <span className="block font-mono text-[10px] text-muted-foreground">{sub}</span>
          </label>
        ))}
      </fieldset>
      <button
        type="button"
        onClick={seal}
        disabled={busy !== null}
        className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-sm bg-foreground text-xs font-bold text-background transition-colors hover:bg-foreground/90 disabled:opacity-60"
      >
        {busy ? (
          <>
            <Spinner className="text-background" /> {busy}
          </>
        ) : (
          label
        )}
      </button>
      {error && <p className="text-[11px] text-destructive">{error}</p>}
    </div>
  );
}
