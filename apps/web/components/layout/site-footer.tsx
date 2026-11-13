import Link from "next/link";
import { Logo } from "./logo";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { href: "/syndicate", label: "Workbench" },
      { href: "/decisions", label: "Sealed decisions" },
      { href: "/leaderboard", label: "Agent leaderboard" },
      { href: "/pricing", label: "Pricing" },
    ],
  },
  {
    title: "Trust",
    links: [
      { href: "/methodology", label: "Methodology" },
      { href: "/methodology#verify", label: "Verify a decision" },
      { href: "https://github.com/Shrysxs/Argus", label: "Source code" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/legal/terms", label: "Terms of service" },
      { href: "/legal/privacy", label: "Privacy policy" },
      { href: "/legal/disclaimer", label: "Risk disclaimer" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-surface/40">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="space-y-3">
          <Logo />
          <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
            A committee of independent AI analysts whose every decision, input and track record is sealed on-chain and
            publicly verifiable.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <h3 className="mb-3 font-mono text-[10px] uppercase tracking-widest text-brass">{col.title}</h3>
            <ul className="space-y-2">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-xs text-muted-foreground transition-colors hover:text-foreground">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border">
        <p className="mx-auto max-w-7xl px-4 py-4 text-[11px] leading-relaxed text-muted-foreground sm:px-6">
          Argus is a research and decision-support tool. Nothing on this site is financial, investment, legal or tax
          advice. Crypto-assets are highly volatile; past agent accuracy does not predict future results. ©{" "}
          {new Date().getFullYear()} Argus.
        </p>
      </div>
    </footer>
  );
}
