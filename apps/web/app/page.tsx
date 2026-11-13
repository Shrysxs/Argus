import Link from "next/link";
import { AGENT_ROSTER } from "@/lib/agents";

const PERSONA_ICONS: Record<string, string> = {
  "value-hunter": "VAL",
  "momentum-trader": "MOM",
  "macro-analyst": "MAC",
  "onchain-sleuth": "ONC",
  "risk-guardian": "RSK",
};

export default function LandingPage() {
  return (
    <div className="flex flex-col ">

      <main className="flex flex-1 flex-col items-center justify-center px-6 pb-20 pt-16 text-center">
        {/* Hero */}
        <div className="mx-auto max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-sm border border-border bg-surface px-3.5 py-1 text-xs font-mono text-foreground/80 mb-8">
            <span className="h-1.5 w-1.5 rounded-full bg-buy" />
            <span className="text-brass font-semibold">ARGUS PROTOCOL</span> • Monad Testnet Consensus Engine
          </div>

          <h1 className="text-4xl font-serif font-bold tracking-tight sm:text-6xl lg:text-7xl text-foreground">
            Decentralized Investment Syndicate.
          </h1>

          <p className="mt-6 text-xl font-serif text-foreground/80 sm:text-2xl max-w-2xl mx-auto leading-relaxed">
            Five specialized quantitative models. One weighted consensus.
            <br className="hidden sm:inline" />
            Every decision permanently sealed on-chain.
          </p>

          <p className="mx-auto mt-4 max-w-xl text-xs sm:text-sm text-muted-foreground leading-relaxed font-sans">
            Five models analyze digital assets across distinct quantitative frameworks (value, momentum, macro, on-chain, and risk), voting with a confidence score to reach an auditable consensus recorded on-chain.
          </p>

          <div className="mt-8 flex items-center justify-center gap-4">
            <Link
              href="/syndicate"
              className="inline-flex h-11 items-center gap-2 rounded-sm bg-foreground px-8 text-sm font-bold text-background transition-colors hover:bg-foreground/90"
            >
              Enter syndicate workbench
            </Link>
          </div>
        </div>

        {/* Agent roster preview */}
        <div className="mx-auto mt-20 w-full max-w-5xl">
          <div className="flex items-center justify-between mb-4 border-b border-border pb-3">
            <h2 className="text-xs font-mono font-semibold uppercase tracking-widest text-brass">
              Investment Committee Roster
            </h2>
            <span className="text-xs font-mono text-muted-foreground">
              5/5 Frameworks Operational
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {AGENT_ROSTER.map((agent) => (
              <div
                key={agent.id}
                className="rounded-sm border border-border bg-surface p-4 text-left transition-colors hover:border-brass/40"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-sm bg-surface-2 text-[10px] font-mono font-bold border border-border text-brass">
                    {PERSONA_ICONS[agent.id] || "MDL"}
                  </span>
                  <p className="text-xs font-serif font-bold text-foreground">{agent.name}</p>
                </div>
                <p className="text-[11px] leading-relaxed text-muted-foreground font-sans">
                  {agent.framework}
                </p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="border-t border-border px-6 py-6 text-center text-xs font-mono text-muted-foreground/80 uppercase">
        Institutional Decision-Support Tool. Research and Educational Material Only.
      </footer>
    </div>
  );
}
