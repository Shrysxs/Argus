import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { ANALYSIS_COST_CENTS, formatCents, listTransactions } from "@/lib/billing";
import { formatDateTime } from "@/lib/format";
import { PageContainer, PageHeader } from "@/components/page-header";
import { AccountForms } from "./account-forms";

export const metadata: Metadata = { title: "Account", robots: { index: false } };

const KIND_LABEL: Record<string, string> = {
  signup_grant: "Starter credits",
  analysis: "Committee run",
  refund: "Refund",
  admin_grant: "Credit grant",
  opening_balance: "Opening balance",
};

export default async function AccountPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/account");

  const [txns, runs, sealed] = await Promise.all([
    listTransactions(user.id, 50),
    db.analyzeResult.count({ where: { userId: user.id } }),
    db.analyzeResult.count({ where: { userId: user.id, sealed: true } }),
  ]);
  const runsLeft = ANALYSIS_COST_CENTS > 0 ? Math.floor(user.creditsCents / ANALYSIS_COST_CENTS) : null;

  return (
    <PageContainer className="space-y-8">
      <PageHeader eyebrow="Account" title="Account & credits" description={`Signed in as ${user.email} · member since ${formatDateTime(user.createdAt).split(",")[0]}`} />

      <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          ["Credit balance", formatCents(user.creditsCents)],
          ["Runs remaining", runsLeft === null ? "Unlimited" : runsLeft.toLocaleString()],
          ["Analyses run", runs.toLocaleString()],
          ["Sealed on-chain", sealed.toLocaleString()],
        ].map(([label, value]) => (
          <div key={label} className="rounded-md border border-border bg-surface p-4">
            <dt className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</dt>
            <dd className="tabular mt-1 font-serif text-2xl font-bold">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <section>
          <div className="mb-3 flex items-end justify-between">
            <h2 className="font-serif text-lg font-bold">Credit activity</h2>
            <Link href="/pricing" className="text-xs text-muted-foreground hover:text-foreground">
              How credits work →
            </Link>
          </div>
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="bg-surface-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2">Description</th>
                  <th className="px-4 py-2 text-right">Amount</th>
                  <th className="px-4 py-2 text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-surface">
                {txns.map((t) => (
                  <tr key={t.id}>
                    <td className="whitespace-nowrap px-4 py-2 text-xs text-muted-foreground">{formatDateTime(t.createdAt)}</td>
                    <td className="px-4 py-2 text-xs">
                      {t.reference && !t.reference.startsWith("pending:") && (t.kind === "analysis" || t.kind === "refund") ? (
                        <Link href={`/d/${t.reference}`} className="hover:text-brass">
                          {KIND_LABEL[t.kind] ?? t.kind}
                        </Link>
                      ) : (
                        (KIND_LABEL[t.kind] ?? t.kind)
                      )}
                      {t.note && <span className="block text-[11px] text-muted-foreground">{t.note}</span>}
                    </td>
                    <td className={`tabular px-4 py-2 text-right font-mono text-xs ${t.amountCents < 0 ? "" : "text-success"}`}>
                      {t.amountCents < 0 ? "−" : "+"}
                      {formatCents(Math.abs(t.amountCents))}
                    </td>
                    <td className="tabular px-4 py-2 text-right font-mono text-xs">{formatCents(t.balanceAfterCents)}</td>
                  </tr>
                ))}
                {txns.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-xs text-muted-foreground">
                      No credit activity yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <AccountForms />
      </div>
    </PageContainer>
  );
}
