import Link from "next/link";
import { AGENT_ROSTER } from "@/lib/agents";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between px-6 py-4 md:px-10">
        <span className="text-lg font-semibold tracking-tight">Argus</span>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 pb-20 text-center">
        {/* Hero */}
        <div className="mx-auto max-w-2xl">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            <span
              className="bg-gradient-to-r from-[var(--accent-glow)] to-[oklch(0.85_0.08_192)] bg-clip-text text-transparent"
            >
              AI Investment Syndicate
            </span>
          </h1>

          <p className="mt-4 text-lg text-muted-foreground sm:text-xl">
            5 specialized agents. One weighted consensus.
            <br className="hidden sm:inline" />
            Every decision sealed on-chain.
          </p>

          <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground/70">
            Each agent analyzes assets through a distinct framework — value,
            momentum, macro, on-chain, risk — then votes with a confidence
            score. The syndicate reaches consensus. The reasoning is
            permanently auditable.
          </p>

          <div className="mt-8">
            <Link
              href="/syndicate"
              className="inline-flex h-11 items-center rounded-lg bg-[var(--accent-glow)] px-6 text-sm font-medium text-[oklch(0.15_0_0)] transition-opacity hover:opacity-90"
            >
              Launch Syndicate
            </Link>
          </div>
        </div>

        {/* Agent roster — product feature copy, not analysis data */}
        <div className="mx-auto mt-20 w-full max-w-4xl">
          <h2 className="mb-6 text-xs font-medium uppercase tracking-widest text-muted-foreground">
            The Committee
          </h2>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {AGENT_ROSTER.map((agent) => (
              <div
                key={agent.id}
                className="rounded-lg border border-border/50 bg-card/50 px-4 py-3 text-left transition-colors hover:border-[var(--accent-glow)]/30"
              >
                <p className="text-sm font-medium">{agent.name}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {agent.framework}
                </p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="px-6 py-6 text-center text-xs text-muted-foreground/50 md:px-10">
        Argus is a decision-support tool, not investment advice.
      </footer>
    </div>
  );
}
