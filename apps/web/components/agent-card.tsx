import { AlertTriangle, MinusCircle } from "lucide-react";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { agentById } from "@/lib/agents";
import { VoteBadge, voteBgClass } from "./vote-badge";

export interface AgentCardData {
  agentId: string;
  status: "pending" | "ok" | "failed" | "abstained";
  vote?: string | null;
  confidence?: number | null;
  reasoning?: string | null;
  dataPointsCited?: string[];
  promptVersion?: string | null;
  modelUsed?: string | null;
  provider?: string | null;
  error?: string | null;
}

export function AgentCard({ data }: { data: AgentCardData }) {
  const agent = agentById(data.agentId);
  const name = agent?.name ?? data.agentId;

  return (
    <article
      className={`flex flex-col rounded-md border bg-surface p-4 transition-colors ${
        data.status === "ok" ? "border-border hover:border-brass/40" : "border-border/70"
      } ${data.status === "abstained" || data.status === "failed" ? "opacity-90" : ""}`}
      aria-busy={data.status === "pending"}
    >
      <header className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-sm border border-border bg-surface-2 font-mono text-[10px] font-bold text-brass">
            {agent?.short ?? "AGT"}
          </span>
          <div>
            <h3 className="font-serif text-sm font-bold leading-tight">{name}</h3>
            <p className="text-[10px] text-muted-foreground">{agent?.framework}</p>
          </div>
        </div>
        {data.status === "ok" && <VoteBadge vote={data.vote} />}
      </header>

      {data.status === "pending" && (
        <div className="mt-4 space-y-2">
          <Skeleton className="h-2.5 w-3/4" />
          <Skeleton className="h-2.5 w-1/2" />
          <Skeleton className="h-2.5 w-5/6" />
          <p className="pt-1 font-mono text-[10px] text-muted-foreground">Analyzing…</p>
        </div>
      )}

      {data.status === "ok" && (
        <div className="mt-4 flex flex-1 flex-col gap-3">
          <div className="space-y-1">
            <div className="flex justify-between font-mono text-[10px] text-muted-foreground">
              <span>Confidence</span>
              <span className="tabular font-bold text-foreground">{data.confidence}%</span>
            </div>
            <div className="h-1 overflow-hidden bg-muted">
              <div className={`h-full ${voteBgClass(data.vote)}`} style={{ width: `${data.confidence ?? 0}%` }} />
            </div>
          </div>
          <p className="text-xs leading-relaxed text-foreground/85">{data.reasoning}</p>
          {data.dataPointsCited && data.dataPointsCited.length > 0 && (
            <ul className="flex flex-wrap gap-1" aria-label="Data points cited">
              {data.dataPointsCited.map((c, i) => (
                <li key={i} className="rounded-sm border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-foreground/80">
                  {c}
                </li>
              ))}
            </ul>
          )}
          <footer className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-2 font-mono text-[9px] text-muted-foreground">
            <span className="text-brass">{data.promptVersion}</span>
            <span className="truncate" title={`${data.provider ?? ""} ${data.modelUsed ?? ""}`}>
              {data.provider ? `${data.provider} · ` : ""}
              {data.modelUsed}
            </span>
          </footer>
        </div>
      )}

      {data.status === "abstained" && (
        <div className="mt-4 flex gap-2 text-[11px] text-muted-foreground">
          <MinusCircle className="mt-0.5 size-3.5 shrink-0" />
          <p>
            <span className="font-medium text-foreground">Abstained.</span> {data.error}
          </p>
        </div>
      )}

      {data.status === "failed" && (
        <div className="mt-4 flex gap-2 text-[11px] text-destructive">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          <p>
            <span className="font-medium">No valid response.</span> <span className="opacity-80">{data.error}</span>
          </p>
        </div>
      )}
    </article>
  );
}
