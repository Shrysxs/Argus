import Link from "next/link";
import { AGENT_ROSTER } from "@/lib/agents";
import { Header } from "@/components/header";

const PERSONA_ICONS: Record<string, string> = {
  "value-hunter": "⚖️",
  "momentum-trader": "📈",
  "macro-analyst": "🌐",
  "onchain-sleuth": "⛓️",
  "risk-guardian": "🛡️",
};

export default function LandingPage() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#08090C] text-foreground">
      {/* Background glow Orbs */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-gradient-to-tr from-purple-900/20 via-cyan-900/10 to-transparent blur-3xl" />

      <Header />

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-20 pt-10 text-center">
        {/* Hero */}
        <div className="mx-auto max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/20 bg-purple-500/10 px-3.5 py-1 text-xs font-mono font-medium text-purple-300 backdrop-blur-md mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-pulse" />
            Monad Testnet Protocol • Live Deliberation Engine
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl">
            <span className="bg-gradient-to-r from-purple-400 via-purple-300 to-cyan-400 bg-clip-text text-transparent">
              AI Investment Syndicate
            </span>
          </h1>

          <p className="mt-6 text-lg text-muted-foreground sm:text-xl font-medium">
            5 specialized agents. One weighted consensus.
            <br className="hidden sm:inline" />
            Every decision permanently sealed on-chain.
          </p>

          <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground/80 leading-relaxed font-sans">
            Each agent analyzes assets through a distinct quantitative framework — value,
            momentum, macro, on-chain, risk — voting with a confidence score.
            The syndicate reaches auditable consensus sealed directly to the ledger.
          </p>

          <div className="mt-8 flex items-center justify-center gap-4">
            <Link
              href="/syndicate"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-7 text-sm font-semibold text-white transition-all shadow-[0_0_25px_rgba(139,92,246,0.3)] hover:shadow-[0_0_35px_rgba(139,92,246,0.5)] hover:opacity-95"
            >
              Launch Syndicate ⚡
            </Link>
          </div>
        </div>

        {/* Agent roster preview */}
        <div className="mx-auto mt-20 w-full max-w-5xl">
          <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-3">
            <h2 className="text-xs font-mono font-semibold uppercase tracking-widest text-muted-foreground">
              The AI Investment Committee
            </h2>
            <span className="text-xs font-mono text-purple-400">
              5/5 Frameworks Operational
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {AGENT_ROSTER.map((agent) => (
              <div
                key={agent.id}
                className="group rounded-xl border border-white/10 bg-slate-950/60 p-4 text-left backdrop-blur-md transition-all hover:border-purple-500/40 hover:bg-slate-900/80 hover:shadow-[0_0_20px_rgba(139,92,246,0.15)]"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 text-sm border border-white/10">
                    {PERSONA_ICONS[agent.id] || "🤖"}
                  </span>
                  <p className="text-xs font-semibold text-foreground">{agent.name}</p>
                </div>
                <p className="text-[11px] leading-relaxed text-muted-foreground/80 font-sans">
                  {agent.framework}
                </p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="relative z-10 border-t border-white/5 px-6 py-6 text-center text-xs font-mono text-muted-foreground/50 md:px-10">
        Argus is a decision-support tool, not licensed investment advice.
      </footer>
    </div>
  );
}
