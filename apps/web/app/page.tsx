import Link from "next/link";
import { AGENT_ROSTER } from "@/lib/agents";
import { Header } from "@/components/header";

const PERSONA_ICONS: Record<string, string> = {
  "value-hunter": "VAL",
  "momentum-trader": "MOM",
  "macro-analyst": "MAC",
  "onchain-sleuth": "ONC",
  "risk-guardian": "RSK",
};

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#0A0B0D] text-[#F3F4F6]">
      <Header />

      <main className="flex flex-1 flex-col items-center justify-center px-6 pb-20 pt-16 text-center">
        {/* Hero */}
        <div className="mx-auto max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-sm border border-[#1E222A] bg-[#12141A] px-3.5 py-1 text-xs font-mono text-neutral-300 mb-8">
            <span className="h-1.5 w-1.5 rounded-full bg-[#16A34A]" />
            <span className="text-[#B08D57] font-semibold">ARGUS PROTOCOL</span> • Monad Testnet Consensus Engine
          </div>

          <h1 className="text-4xl font-serif font-bold tracking-tight sm:text-6xl lg:text-7xl text-[#F3F4F6]">
            Decentralized Investment Syndicate.
          </h1>

          <p className="mt-6 text-xl font-serif text-neutral-200 sm:text-2xl max-w-2xl mx-auto leading-relaxed">
            Five specialized quantitative models. One weighted consensus.
            <br className="hidden sm:inline" />
            Every decision permanently sealed on-chain.
          </p>

          <p className="mx-auto mt-4 max-w-xl text-xs sm:text-sm text-neutral-400 leading-relaxed font-sans">
            Five models analyze digital assets across distinct quantitative frameworks (value, momentum, macro, on-chain, and risk), voting with a confidence score to reach an auditable consensus recorded on-chain.
          </p>

          <div className="mt-8 flex items-center justify-center gap-4">
            <Link
              href="/syndicate"
              className="inline-flex h-11 items-center gap-2 rounded-sm bg-[#F3F4F6] px-8 text-sm font-bold text-[#0A0B0D] transition-colors hover:bg-neutral-200"
            >
              Enter syndicate workbench
            </Link>
          </div>
        </div>

        {/* Agent roster preview */}
        <div className="mx-auto mt-20 w-full max-w-5xl">
          <div className="flex items-center justify-between mb-4 border-b border-[#1E222A] pb-3">
            <h2 className="text-xs font-mono font-semibold uppercase tracking-widest text-[#B08D57]">
              Investment Committee Roster
            </h2>
            <span className="text-xs font-mono text-neutral-400">
              5/5 Frameworks Operational
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {AGENT_ROSTER.map((agent) => (
              <div
                key={agent.id}
                className="rounded-sm border border-[#1E222A] bg-[#12141A] p-4 text-left transition-colors hover:border-[#B08D57]/40"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-sm bg-[#181A24] text-[10px] font-mono font-bold border border-[#1E222A] text-[#B08D57]">
                    {PERSONA_ICONS[agent.id] || "MDL"}
                  </span>
                  <p className="text-xs font-serif font-bold text-[#F3F4F6]">{agent.name}</p>
                </div>
                <p className="text-[11px] leading-relaxed text-neutral-400 font-sans">
                  {agent.framework}
                </p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="border-t border-[#1E222A] px-6 py-6 text-center text-xs font-mono text-neutral-500 uppercase">
        Institutional Decision-Support Tool. Research and Educational Material Only.
      </footer>
    </div>
  );
}
