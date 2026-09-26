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
    <div className="flex min-h-screen flex-col bg-[#000000] text-white">
      <Header />

      <main className="flex flex-1 flex-col items-center justify-center px-6 pb-20 pt-16 text-center">
        {/* Hero */}
        <div className="mx-auto max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#12141A] px-3.5 py-1 text-xs font-sans text-neutral-300 mb-8">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Monad Testnet Protocol • Live Deliberation Engine
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl text-white">
            AI Investment Syndicate.
          </h1>

          <p className="mt-6 text-lg text-neutral-300 sm:text-xl font-medium max-w-2xl mx-auto leading-relaxed">
            5 specialized agents. One weighted consensus.
            <br className="hidden sm:inline" />
            Every decision permanently sealed on-chain.
          </p>

          <p className="mx-auto mt-4 max-w-xl text-sm text-neutral-400 leading-relaxed font-sans">
            Each agent analyzes assets through a distinct quantitative framework — value,
            momentum, macro, on-chain, risk — voting with a confidence score.
            The syndicate reaches auditable consensus sealed directly to the ledger.
          </p>

          <div className="mt-8 flex items-center justify-center gap-4">
            <Link
              href="/syndicate"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-8 text-sm font-semibold text-black transition-colors hover:bg-neutral-200"
            >
              Launch Syndicate ⚡
            </Link>
          </div>
        </div>

        {/* Agent roster preview */}
        <div className="mx-auto mt-20 w-full max-w-5xl">
          <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
            <h2 className="text-xs font-sans font-medium uppercase tracking-widest text-neutral-400">
              The AI Investment Committee
            </h2>
            <span className="text-xs font-sans text-neutral-400">
              5/5 Frameworks Operational
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {AGENT_ROSTER.map((agent) => (
              <div
                key={agent.id}
                className="rounded-xl border border-white/10 bg-[#0E1015] p-4 text-left transition-colors hover:border-white/20"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#16181F] text-sm border border-white/10">
                    {PERSONA_ICONS[agent.id] || "🤖"}
                  </span>
                  <p className="text-xs font-bold text-white">{agent.name}</p>
                </div>
                <p className="text-[11px] leading-relaxed text-neutral-400 font-sans">
                  {agent.framework}
                </p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="border-t border-white/10 px-6 py-6 text-center text-xs font-sans text-neutral-500">
        Research & educational tool only — not financial advice.
      </footer>
    </div>
  );
}
