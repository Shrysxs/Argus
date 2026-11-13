import type { Metadata } from "next";

export const metadata: Metadata = { title: "Risk disclaimer" };

export default function DisclaimerPage() {
  return (
    <>
      <h1>Risk disclaimer</h1>
      <p className="text-xs text-muted-foreground">Last updated 13 November 2026</p>
      <p>
        <strong>Argus does not provide financial, investment, legal or tax advice.</strong> Recommendations shown on this site
        (&ldquo;BUY&rdquo;, &ldquo;SELL&rdquo;, &ldquo;HOLD&rdquo;) are outputs of automated large-language-model analysts. They
        are research artifacts produced for transparency and education, not instructions to trade.
      </p>
      <h2>AI analysts can be wrong</h2>
      <ul>
        <li>Language models can misread data, reason inconsistently between runs and state wrong conclusions with high confidence.</li>
        <li>Confidence scores are self-reported by the models and are not calibrated probabilities.</li>
        <li>Agreement between analysts does not make an outcome more likely; they share limitations and data sources.</li>
      </ul>
      <h2>Data limitations</h2>
      <p>
        Market data comes from third-party public APIs and may be delayed, incomplete or briefly unavailable. When data is
        missing, the affected analysts abstain and the decision page says so.
      </p>
      <h2>Past performance</h2>
      <p>
        Leaderboard statistics describe how past decisions turned out under a fixed scoring rule. They do not predict future
        results.
      </p>
      <h2>Crypto-asset risk</h2>
      <p>
        Crypto-assets are highly volatile and you can lose all of the money you put in. Only make investment decisions after your
        own research and, where appropriate, advice from a licensed professional in your jurisdiction.
      </p>
      <h2>Testnet</h2>
      <p>
        Decisions are currently sealed on Monad <em>testnet</em>. Testnet records are useful for verification but the network
        carries no economic security guarantees and may be reset.
      </p>
    </>
  );
}
