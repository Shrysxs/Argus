import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Terms of service" };

export default function TermsPage() {
  return (
    <>
      <h1>Terms of service</h1>
      <p className="text-xs text-muted-foreground">Last updated 13 November 2026</p>
      <p>By creating an account or using Argus you agree to these terms.</p>

      <h2>1. The service</h2>
      <p>
        Argus runs automated AI analysts over public market data, combines their votes into a consensus and, at your request,
        records cryptographic hashes of the result on a blockchain. It is a research and decision-support tool. It does not
        execute trades, hold funds or provide personalized advice. See the <Link href="/legal/disclaimer">risk disclaimer</Link>.
      </p>

      <h2>2. Accounts</h2>
      <ul>
        <li>You must provide a valid email address and keep your password secure.</li>
        <li>One person, one account. Automated sign-ups and attempts to circumvent rate limits are not allowed.</li>
        <li>We may suspend accounts that abuse the service or its providers.</li>
      </ul>

      <h2>3. Credits</h2>
      <ul>
        <li>Committee runs consume credits as shown on the <Link href="/pricing">pricing page</Link> before you run them.</li>
        <li>Runs that fail before producing any valid analyst vote are refunded automatically.</li>
        <li>Credits have no cash value, are not transferable and may be adjusted during the testnet beta.</li>
      </ul>

      <h2>4. Sealing and public records</h2>
      <p>
        When you seal a decision you instruct us to publish it. Its hashes are written to a public blockchain and its decision
        page becomes publicly accessible. Blockchain records cannot be altered or removed by anyone, including us.
      </p>

      <h2>5. Acceptable use</h2>
      <ul>
        <li>Do not attempt to tamper with, spoof or misrepresent decision records or verification results.</li>
        <li>Do not use the service to manipulate markets or to present Argus output as licensed investment advice.</li>
        <li>Respect the rate limits; use the public JSON API for programmatic access.</li>
      </ul>

      <h2>6. No warranty</h2>
      <p>
        The service is provided &ldquo;as is&rdquo; without warranties of any kind. AI output may be inaccurate. To the maximum
        extent permitted by law, we are not liable for losses arising from decisions you make using the service.
      </p>

      <h2>7. Changes</h2>
      <p>We may update these terms; material changes will be announced on the site before they take effect.</p>
    </>
  );
}
