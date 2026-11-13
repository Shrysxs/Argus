import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy policy" };

export default function PrivacyPage() {
  return (
    <>
      <h1>Privacy policy</h1>
      <p className="text-xs text-muted-foreground">Last updated 13 November 2026</p>
      <p>This policy describes exactly what Argus stores and why. We collect the minimum needed to run the service.</p>

      <h2>What we store</h2>
      <ul>
        <li><strong>Account:</strong> your email address and a password hash (Argon2id). We never store your password.</li>
        <li><strong>Sessions:</strong> a SHA-256 hash of your session token and its expiry. The token itself only lives in an httpOnly cookie in your browser.</li>
        <li><strong>Analyses:</strong> the assets you analyze, the market snapshot, every analyst&apos;s vote and reasoning, and raw model responses (kept for audit and debugging).</li>
        <li><strong>Credits:</strong> your balance and a ledger of every charge, refund and grant.</li>
        <li><strong>Sealing:</strong> if you seal with your own wallet, the transaction hash and your wallet address.</li>
      </ul>

      <h2>What becomes public</h2>
      <p>
        Unsealed analyses are private to you. <strong>Sealing a decision publishes it</strong>: its decision page (votes,
        reasoning, snapshot, hashes) becomes publicly viewable and its hashes are written to a public blockchain, which cannot be
        deleted. Public pages never show your email or account id. If you sealed with your own wallet, your wallet address is
        visible on-chain and on the decision page.
      </p>

      <h2>Cookies & local storage</h2>
      <ul>
        <li><code>argus_session</code> — strictly necessary, keeps you signed in (7 days, renewed while active).</li>
        <li>Theme preference — stored in your browser&apos;s local storage.</li>
      </ul>
      <p>We do not use advertising or cross-site tracking cookies.</p>

      <h2>Service providers</h2>
      <ul>
        <li><strong>Hosting and database</strong> providers process the data above on our behalf.</li>
        <li><strong>AI model providers</strong> (e.g. Groq, OpenRouter, Google, OpenAI) receive market data and analyst instructions only — never your email or account details.</li>
        <li><strong>Market data providers</strong> (CoinGecko, CryptoCompare, alternative.me) receive the asset symbol being analyzed.</li>
        <li><strong>Rate limiting</strong> may process your IP address transiently (for up to 15 minutes) to prevent abuse.</li>
        <li><strong>Charts</strong> are embedded from TradingView, which receives standard request data when the widget loads.</li>
      </ul>

      <h2>Retention & your choices</h2>
      <p>
        You can change your password or sign out of all devices from your account page. To export or delete your account data,
        open a request via the project&apos;s GitHub repository. On-chain records and the public pages of sealed decisions are
        retained, because deleting them would break the public audit trail they exist to provide; they contain no account
        identifiers.
      </p>
    </>
  );
}
