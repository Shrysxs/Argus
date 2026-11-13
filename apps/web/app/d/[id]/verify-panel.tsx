"use client";

import { useState } from "react";
import { CheckCircle2, Circle, XCircle } from "lucide-react";
import type { DecisionPayload } from "@argus/shared-types";
import { canonicalJson, promptCommitmentPayload, reasoningCommitmentPayload } from "@argus/data-layer/canonical";
import { createMonadPublicClient, verifyDecisionTx } from "@argus/chain-adapters/browser";
import { Spinner } from "@workspace/ui/components/spinner";

interface VoteForVerify {
  agentId: string;
  vote: string;
  confidence: number;
  reasoning: string;
  dataPointsCited: string[];
  promptVersion: string;
  promptHash: string | null;
}

interface Props {
  snapshotData: unknown;
  /** Exact canonical bytes that were hashed (preferred over re-serializing snapshotData). */
  snapshotCanonical: string | null;
  dataSnapshotHash: string;
  promptVersionHash: string;
  reasoningHash: string | null;
  votes: VoteForVerify[];
  txHash: string | null;
  sealPayload: DecisionPayload;
  registryAddress: string;
  rpcUrl: string;
}

type CheckState = { status: "pending" | "running" | "pass" | "fail" | "skip"; detail?: string };

async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const CHECKS = [
  ["snapshot", "Snapshot data hashes to the recorded data hash"],
  ["prompts", "Published prompt texts match each vote's prompt hash"],
  ["promptCommit", "Prompt versions hash to the recorded prompt hash"],
  ["reasoning", "Votes and reasoning hash to the recorded reasoning hash"],
  ["chain", "On-chain event matches this decision exactly"],
] as const;

type CheckId = (typeof CHECKS)[number][0];

/** Recomputes every hash in the browser and re-reads the chain via a public RPC — no trust in Argus servers required. */
export function VerifyPanel(props: Props) {
  const [results, setResults] = useState<Record<CheckId, CheckState> | null>(null);
  const [running, setRunning] = useState(false);

  async function run() {
    setRunning(true);
    const r = Object.fromEntries(CHECKS.map(([id]) => [id, { status: "pending" }])) as Record<CheckId, CheckState>;
    const update = (id: CheckId, s: CheckState) => setResults((prev) => ({ ...(prev ?? r), [id]: s }));
    setResults(r);

    const check = async (id: CheckId, fn: () => Promise<CheckState>) => {
      update(id, { status: "running" });
      try {
        update(id, await fn());
      } catch (err) {
        update(id, { status: "fail", detail: err instanceof Error ? err.message : String(err) });
      }
    };

    await check("snapshot", async () => {
      if (!props.snapshotData && !props.snapshotCanonical) return { status: "skip", detail: "Snapshot not stored for this legacy decision" };
      if (props.snapshotCanonical && canonicalJson(JSON.parse(props.snapshotCanonical)) !== props.snapshotCanonical) {
        return { status: "fail", detail: "published snapshot bytes are not canonical JSON" };
      }
      const h = await sha256Hex(props.snapshotCanonical ?? canonicalJson(props.snapshotData));
      return h === props.dataSnapshotHash.replace(/^0x/, "") ? { status: "pass" } : { status: "fail", detail: `computed ${h.slice(0, 12)}…` };
    });

    await check("prompts", async () => {
      const withHash = props.votes.filter((v) => v.promptHash);
      if (withHash.length === 0) return { status: "skip", detail: "No prompt hashes recorded" };
      for (const v of withHash) {
        const res = await fetch(`/api/prompts?ref=${encodeURIComponent(v.promptVersion)}`);
        if (!res.ok) return { status: "fail", detail: `${v.promptVersion} not published` };
        const h = await sha256Hex(await res.text());
        if (h !== v.promptHash) return { status: "fail", detail: `${v.promptVersion} text does not match` };
      }
      return { status: "pass", detail: `${withHash.length} prompt files checked` };
    });

    await check("promptCommit", async () => {
      const h = await sha256Hex(canonicalJson(promptCommitmentPayload(props.votes)));
      return h === props.promptVersionHash.replace(/^0x/, "") ? { status: "pass" } : { status: "fail", detail: "mismatch (legacy hash format?)" };
    });

    await check("reasoning", async () => {
      if (!props.reasoningHash) return { status: "skip", detail: "No reasoning hash recorded" };
      const h = await sha256Hex(canonicalJson(reasoningCommitmentPayload(props.dataSnapshotHash, props.votes)));
      return h === props.reasoningHash ? { status: "pass" } : { status: "fail", detail: "mismatch" };
    });

    await check("chain", async () => {
      if (!props.txHash) return { status: "skip", detail: "Not sealed" };
      const client = createMonadPublicClient(props.rpcUrl);
      const v = await verifyDecisionTx(client, props.registryAddress, props.txHash, props.sealPayload);
      return { status: "pass", detail: `block ${v.blockNumber}` };
    });

    setRunning(false);
  }

  return (
    <div className="mt-4 space-y-3">
      <button
        type="button"
        onClick={run}
        disabled={running}
        className="inline-flex h-8 w-full items-center justify-center gap-2 rounded-sm border border-brass/50 text-xs font-medium text-brass transition-colors hover:bg-brass/10 disabled:opacity-60"
      >
        {running ? <Spinner /> : null}
        {running ? "Verifying…" : results ? "Verify again" : "Verify independently"}
      </button>
      {results && (
        <ul className="space-y-2">
          {CHECKS.map(([id, label]) => {
            const s = results[id];
            return (
              <li key={id} className="flex gap-2 text-[11px]">
                {s.status === "pass" ? (
                  <CheckCircle2 className="mt-px size-3.5 shrink-0 text-success" />
                ) : s.status === "fail" ? (
                  <XCircle className="mt-px size-3.5 shrink-0 text-destructive" />
                ) : s.status === "running" ? (
                  <Spinner className="mt-px size-3.5 shrink-0" />
                ) : (
                  <Circle className="mt-px size-3.5 shrink-0 text-muted-foreground" />
                )}
                <span>
                  {label}
                  {s.detail && <span className="block text-muted-foreground">{s.detail}</span>}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
