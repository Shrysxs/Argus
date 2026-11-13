import type { Metadata } from "next";
import Link from "next/link";
import { AGENT_ROSTER } from "@/lib/agents";
import { PageContainer } from "@/components/page-header";

export const metadata: Metadata = {
  title: "Methodology",
  description: "How Argus builds market snapshots, runs its analysts, computes consensus, scores outcomes and lets anyone verify a decision.",
};

function Section({ id, eyebrow, title, children }: { id: string; eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-border py-10 first:border-0 first:pt-0">
      <p className="font-mono text-[10px] uppercase tracking-widest text-brass">{eyebrow}</p>
      <h2 className="mt-1 font-serif text-2xl font-bold">{title}</h2>
      <div className="mt-4 space-y-4 text-sm leading-relaxed text-foreground/85">{children}</div>
    </section>
  );
}

function Code({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-sm border border-border bg-surface p-4 font-mono text-[12px] leading-relaxed">
      <code>{children}</code>
    </pre>
  );
}

const TOC = [
  ["snapshot", "Market snapshot"],
  ["agents", "The analysts"],
  ["consensus", "Consensus"],
  ["integrity", "Hashes & sealing"],
  ["verify", "Verify a decision"],
  ["scoring", "Outcome scoring"],
  ["limits", "Limitations"],
];

export default function MethodologyPage() {
  return (
    <PageContainer className="grid gap-10 lg:grid-cols-[14rem_1fr]">
      <aside className="hidden lg:block">
        <nav className="sticky top-24 space-y-1 text-sm" aria-label="On this page">
          <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">On this page</p>
          {TOC.map(([id, label]) => (
            <a key={id} href={`#${id}`} className="block py-1 text-muted-foreground hover:text-foreground">
              {label}
            </a>
          ))}
        </nav>
      </aside>

      <article className="max-w-3xl">
        <header className="mb-10">
          <p className="font-mono text-[10px] uppercase tracking-widest text-brass">Methodology</p>
          <h1 className="mt-1 font-serif text-4xl font-bold tracking-tight">How Argus reaches — and proves — a decision</h1>
          <p className="mt-4 text-muted-foreground">
            Everything below is implemented in the open-source code. Where this page and the code disagree, the code wins and
            this page is a bug.
          </p>
        </header>

        <Section id="snapshot" eyebrow="Step 1" title="Market snapshot">
          <p>
            Each run starts by capturing one snapshot of the asset. Spot price comes from CoinGecko (CryptoCompare as fallback).
            Around 210 days of daily closes and volumes are used to compute RSI-14 (Wilder), MACD(12, 26, 9), EMA-20/50/200,
            7/30/90-day returns, annualized 30-day realized volatility, drawdown from the 90-day high and a 7-vs-30-day volume
            trend. The Crypto Fear &amp; Greed index provides sentiment.
          </p>
          <p>
            If a data class is unavailable the snapshot records <em>why</em>, and analysts that require it abstain instead of
            guessing. Only spot price is mandatory. Snapshots are cached for 60 seconds, so two runs a few seconds apart see
            identical data.
          </p>
        </Section>

        <Section id="agents" eyebrow="Step 2" title="The analysts">
          <p>
            Each analyst is a versioned prompt plus a declared set of data inputs. An analyst only receives the snapshot keys it
            declares, must respond with schema-valid JSON (vote, confidence 0–100, reasoning, cited data points), and is retried
            once with the validation error if it doesn&apos;t. Invalid output is never patched into a vote — it is recorded as a
            failure, along with the raw provider response.
          </p>
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Analyst</th>
                  <th className="px-3 py-2">Framework</th>
                  <th className="px-3 py-2">Inputs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {AGENT_ROSTER.map((a) => (
                  <tr key={a.id}>
                    <td className="px-3 py-2 font-medium">{a.name}</td>
                    <td className="px-3 py-2 text-muted-foreground">{a.framework}</td>
                    <td className="px-3 py-2 text-muted-foreground">{a.inputs}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            Prompt texts are public at <code className="font-mono text-xs">/api/prompts?ref=&lt;agent&gt;/&lt;version&gt;</code>.
            Prompts are never edited in place; changes ship as a new version.
          </p>
        </Section>

        <Section id="consensus" eyebrow="Step 3" title="Consensus">
          <p>Votes are weighted by each analyst&apos;s confidence. For each direction d ∈ {"{BUY, SELL, HOLD}"}:</p>
          <Code>{`W_d          = Σ confidence_i   over analysts i that voted d
recommendation = argmax_d W_d
confidence     = W_recommendation / Σ_d W_d × 100
split          = (W_first − W_second) < 10% of Σ_d W_d`}</Code>
          <p>
            A run needs at least 3 valid votes (quorum) to be sealable. Runs where an analyst failed are labelled{" "}
            <em>degraded</em>; abstentions due to missing data are not.
          </p>
        </Section>

        <Section id="integrity" eyebrow="Step 4" title="Hashes & sealing">
          <p>
            All hashes are SHA-256 over canonical JSON (object keys sorted recursively, no whitespace), so anyone in any language
            gets the same bytes.
          </p>
          <Code>{`dataSnapshotHash  = sha256(canonical(snapshot.data))
promptHash_i      = sha256(prompt file text, utf-8)
promptVersionHash = sha256(canonical({ v: 1, prompts: [{ agentId, promptVersion, promptHash }] sorted by agentId }))
reasoningHash     = sha256(canonical({ v: 1, snapshotHash: dataSnapshotHash,
                      votes: [{ agentId, vote, confidence, reasoning, dataPointsCited }] sorted by agentId }))`}</Code>
          <p>
            Sealing calls <code className="font-mono text-xs">recordDecision</code> on the registry contract, which emits{" "}
            <code className="font-mono text-xs">DecisionRecorded(asset, decision, confidenceBps, dataSnapshotHash, promptVersionHash, timestamp, sender)</code>.
            The contract stores nothing and holds no funds. You can seal with your own wallet (you become the on-chain signer) or
            via the Argus relayer. Wallet-signed transactions are fetched from the chain and checked field-by-field before Argus
            marks them sealed.
          </p>
        </Section>

        <Section id="verify" eyebrow="Trust" title="Verify a decision yourself">
          <p>
            Every decision page has a <strong>Verify independently</strong> button that runs these checks in your browser,
            reading the chain directly from a public RPC:
          </p>
          <ol className="list-decimal space-y-1 pl-5">
            <li>
              Recompute <code className="font-mono text-xs">dataSnapshotHash</code> from the published canonical snapshot bytes
              (stored verbatim, so no number is ever re-serialized).
            </li>
            <li>Download each prompt version and check it hashes to the vote&apos;s <code className="font-mono text-xs">promptHash</code>.</li>
            <li>Recompute <code className="font-mono text-xs">promptVersionHash</code> and <code className="font-mono text-xs">reasoningHash</code> from the votes.</li>
            <li>Fetch the transaction receipt and decode the <code className="font-mono text-xs">DecisionRecorded</code> event.</li>
          </ol>
          <p>To do it without our UI at all:</p>
          <Code>{`curl -s https://<argus-host>/api/decisions/<id> > decision.json
node -e '
  const d = require("./decision.json"), c = require("crypto");
  const canon = (v) => v === null || typeof v !== "object" ? v
    : Array.isArray(v) ? v.map(canon)
    : Object.fromEntries(Object.keys(v).sort().map((k) => [k, canon(v[k])]));
  const bytes = d.snapshot.canonical;  // the exact bytes that were hashed
  const isCanonical = JSON.stringify(canon(JSON.parse(bytes))) === bytes;
  const h = c.createHash("sha256").update(bytes).digest("hex");
  console.log(isCanonical && h === d.dataSnapshotHash ? "snapshot OK" : "MISMATCH");'`}</Code>
        </Section>

        <Section id="scoring" eyebrow="Track record" title="Outcome scoring">
          <p>
            Sealed decisions are scored automatically once their horizon has passed (7 days by default) by comparing the
            asset&apos;s price at decision time with its price at the horizon. A move beyond ±2% counts as directional:
          </p>
          <Code>{`BUY  is correct when  return >  +2%
SELL is correct when  return <  −2%
HOLD is correct when  |return| ≤ 2%`}</Code>
          <p>
            Each analyst&apos;s vote in a scored decision is graded the same way. The{" "}
            <Link href="/leaderboard" className="text-brass hover:underline">leaderboard</Link> reports hit rate and a
            confidence-weighted Brier score (lower is better), so an analyst that is confidently wrong is penalized more than one
            that hedged.
          </p>
        </Section>

        <Section id="limits" eyebrow="Honesty" title="Limitations">
          <ul className="list-disc space-y-1 pl-5">
            <li>Analysts are large language models. They can be wrong, inconsistent across runs and confidently mistaken.</li>
            <li>The On-chain Sleuth abstains until an on-chain metrics provider (MVRV, SOPR, netflows) is connected.</li>
            <li>Market data comes from free-tier public APIs and may be delayed or briefly unavailable.</li>
            <li>Sealing currently happens on Monad <em>testnet</em>.</li>
            <li>Nothing here is financial advice. See the <Link href="/legal/disclaimer" className="text-brass hover:underline">risk disclaimer</Link>.</li>
          </ul>
        </Section>
      </article>
    </PageContainer>
  );
}
