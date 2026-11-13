import { getSessionUser } from "@/lib/auth/session";
import { HeaderClient } from "./header-client";

/** Server component: resolves the session so the header never flashes a logged-out state. */
export async function SiteHeader() {
  const user = await getSessionUser().catch(() => null);
  return (
    <HeaderClient
      user={user ? { email: user.email, creditsUsd: Number(user.creditsUsd), isAdmin: Boolean(user.isAdmin) } : null}
    />
  );
}
