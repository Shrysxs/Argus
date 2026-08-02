import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@workspace/ui/globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Argus — AI Investment Syndicate",
  description:
    "5 specialized AI agents. One weighted consensus. Every decision sealed on-chain.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} min-h-screen bg-background text-foreground antialiased`}>
        {children}
      </body>
    </html>
  );
}