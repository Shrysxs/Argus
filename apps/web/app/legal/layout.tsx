import Link from "next/link";
import { PageContainer } from "@/components/page-header";

// NOTE: These documents describe how the software actually behaves, but they
// have not been reviewed by a lawyer. Get legal review for your target
// jurisdictions before a public, non-testnet launch (AGENTS.md §9).

const DOCS = [
  ["/legal/terms", "Terms of service"],
  ["/legal/privacy", "Privacy policy"],
  ["/legal/disclaimer", "Risk disclaimer"],
] as const;

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <PageContainer className="grid gap-10 lg:grid-cols-[12rem_1fr]">
      <nav className="space-y-1 text-sm" aria-label="Legal">
        <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Legal</p>
        {DOCS.map(([href, label]) => (
          <Link key={href} href={href} className="block py-1 text-muted-foreground hover:text-foreground">
            {label}
          </Link>
        ))}
      </nav>
      <article className="max-w-3xl space-y-4 text-sm leading-relaxed text-foreground/85 [&_h1]:font-serif [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:text-foreground [&_h2]:mt-8 [&_h2]:font-serif [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground [&_li]:ml-5 [&_li]:list-disc [&_a]:text-brass [&_a:hover]:underline">
        {children}
      </article>
    </PageContainer>
  );
}
