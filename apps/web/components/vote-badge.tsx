import { cn } from "@workspace/ui/lib/utils";

const STYLES: Record<string, string> = {
  BUY: "text-buy bg-buy/10 border-buy/30",
  SELL: "text-sell bg-sell/10 border-sell/30",
  HOLD: "text-hold bg-hold/10 border-hold/30",
};

export function voteTextClass(vote: string | null | undefined): string {
  return vote === "BUY" ? "text-buy" : vote === "SELL" ? "text-sell" : vote === "HOLD" ? "text-hold" : "text-muted-foreground";
}

export function voteBgClass(vote: string | null | undefined): string {
  return vote === "BUY" ? "bg-buy" : vote === "SELL" ? "bg-sell" : vote === "HOLD" ? "bg-hold" : "bg-muted-foreground";
}

export function VoteBadge({ vote, className }: { vote: string | null | undefined; className?: string }) {
  const label = vote && vote !== "NONE" ? vote : "NO CONSENSUS";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm border px-2 py-0.5 font-mono text-[10px] font-bold tracking-wider",
        STYLES[vote ?? ""] ?? "border-border bg-muted text-muted-foreground",
        className,
      )}
    >
      {label}
    </span>
  );
}
