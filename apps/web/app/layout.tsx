import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Argus",
  description: "AI Investment Syndicate — decentralized AI investment committee",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}