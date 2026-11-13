import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { ANALYSIS_COST_CENTS, SIGNUP_GRANT_CENTS, formatCents } from "@/lib/billing";
import { PageContainer, PageHeader } from "@/components/page-header";

export const metadata: Metadata = {
  title: "Pricing",
  description: "How Argus credits work: starter credits, the cost of a committee run, and what's always free.",
};

export default function PricingPage() {
  const runs = ANALYSIS_COST_CENTS > 0 ? Math.floor(SIGNUP_GRANT_CENTS / ANALYSIS_COST_CENTS) : null;
  return (
    <PageContainer className="space-y-10">
      <PageHeader
        eyebrow="Pricing"
        title="Simple, usage-based credits"
        description="Argus is in public beta on Monad testnet. You pay only for committee runs — everything that makes decisions verifiable is free."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-md border border-brass/50 bg-surface p-6">
          <p className="font-mono text-[10px] uppercase tracking-widest text-brass">Committee run</p>
          <p className="mt-3 font-serif text-4xl font-bold">
            {ANALYSIS_COST_CENTS > 0 ? formatCents(ANALYSIS_COST_CENTS) : "Free"}
            {ANALYSIS_COST_CENTS > 0 && <span className="text-base font-normal text-muted-foreground"> / run</span>}
          </p>
          <ul className="mt-6 space-y-2 text-sm">
            {[
              "Fresh hashed market snapshot",
              "Five independent analysts, streamed live",
              "Weighted consensus with split & quorum flags",
              "Full audit trail saved to your history",
              "Automatic refund if no analyst responds",
            ].map((f) => (
              <li key={f} className="flex gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-success" /> {f}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-md border border-border bg-surface p-6">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Starter credits</p>
          <p className="mt-3 font-serif text-4xl font-bold">{formatCents(SIGNUP_GRANT_CENTS)}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Granted on sign-up{runs !== null ? ` — enough for ${runs} committee runs` : ""}. No card required.
          </p>
          <Link href="/signup" className="mt-6 inline-flex h-10 items-center rounded-sm bg-foreground px-5 text-sm font-semibold text-background">
            Create an account
          </Link>
        </div>

        <div className="rounded-md border border-border bg-surface p-6">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Always free</p>
          <ul className="mt-4 space-y-2 text-sm">
            {[
              "Sealing via the Argus relayer (testnet)",
              "Public decision pages & ledger",
              "Independent in-browser verification",
              "Agent leaderboard & outcome scoring",
              "Public JSON API for sealed decisions",
            ].map((f) => (
              <li key={f} className="flex gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-success" /> {f}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <section className="max-w-3xl space-y-4 text-sm text-muted-foreground">
        <h2 className="font-serif text-xl font-bold text-foreground">Questions</h2>
        <p>
          <strong className="text-foreground">Can I buy more credits?</strong> Self-serve purchases open after the testnet beta.
          Until then, reach out via the project&apos;s GitHub if you need more.
        </p>
        <p>
          <strong className="text-foreground">Do failed runs cost anything?</strong> No. If market data can&apos;t be fetched or no
          analyst produces a valid vote, the charge is refunded automatically and shows up in your credit activity.
        </p>
        <p>
          <strong className="text-foreground">Is this investment advice?</strong> No. Argus is a research tool. See the{" "}
          <Link href="/legal/disclaimer" className="text-brass hover:underline">
            risk disclaimer
          </Link>
          .
        </p>
      </section>
    </PageContainer>
  );
}
