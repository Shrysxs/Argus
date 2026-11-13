import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { PageContainer } from "@/components/page-header";
import { Workbench } from "./workbench";

export const metadata: Metadata = { title: "Workbench", robots: { index: false } };

export default async function SyndicatePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/syndicate");
  return (
    <PageContainer>
      <Workbench />
    </PageContainer>
  );
}
