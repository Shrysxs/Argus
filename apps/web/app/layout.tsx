import type { Metadata } from "next";
import { Inter, Newsreader, JetBrains_Mono } from "next/font/google";
import "@workspace/ui/globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-serif",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Argus: Institutional Syndicate Platform",
  description:
    "Five specialized quantitative models independently analyze assets, compute weighted consensus, and seal decision records on-chain.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${newsreader.variable} ${jetbrainsMono.variable}`}>
      <body className={`${inter.className} min-h-screen bg-[#0A0B0D] text-[#F3F4F6] antialiased selection:bg-[#B08D57]/20 selection:text-[#F3F4F6]`}>
        {children}
      </body>
    </html>
  );
}