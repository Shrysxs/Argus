import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { VoteBadge } from "./vote-badge";
import { formatDateTime, timeAgo } from "@/lib/format";

export interface DecisionRowData {
  id: string;
  asset: string;
  recommendation: string;
  confidence: number;
  disagreement?: boolean;
  sealed?: boolean;
  status?: string;
  createdAt: Date | string;
  sealedAt?: Date | string | null;
  outcome?: { correct: boolean | null; returnPct: number | null } | null;
}

export function DecisionRow({ d, showSeal = false }: { d: DecisionRowData; showSeal?: boolean }) {
  const when = d.sealedAt ?? d.createdAt;
  return (
    <li>
      <Link
        href={`/d/${d.id}`}
        className="grid grid-cols-[4.5rem_1fr_auto] items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2 sm:grid-cols-[6rem_7rem_1fr_auto]"
      >
        <span className="font-mono text-sm font-semibold">{d.asset}</span>
        <span className="hidden sm:block">
          <VoteBadge vote={d.recommendation} />
        </span>
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="sm:hidden">
            <VoteBadge vote={d.recommendation} />
          </span>
          <span className="tabular font-mono text-foreground">{d.confidence.toFixed(1)}%</span>
          {d.disagreement && d.recommendation !== "NONE" && <span className="hidden text-warning md:inline">split</span>}
          {d.status === "no_quorum" && <span className="text-destructive">no quorum</span>}
          {d.outcome && d.outcome.correct !== null && (
            <span className={d.outcome.correct ? "text-success" : "text-destructive"}>
              {d.outcome.correct ? "✓ correct" : "✗ wrong"}
            </span>
          )}
        </span>
        <span className="flex items-center gap-2 text-right text-[11px] text-muted-foreground" title={formatDateTime(when)}>
          {showSeal && d.sealed && <ShieldCheck className="size-3.5 text-success" aria-label="Sealed on-chain" />}
          {timeAgo(when)}
        </span>
      </Link>
    </li>
  );
}
