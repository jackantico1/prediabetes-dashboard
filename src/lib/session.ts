import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getAuth } from "./auth";

export const getSession = cache(async () => {
  const auth = await getAuth();
  return auth.api.getSession({ headers: await headers() });
});

export type CurrentUser = { id: string; name: string; email: string };

/** Returns the signed-in user or redirects to /login. Use at the top of every app page/action. */
export async function requireUser(): Promise<CurrentUser> {
  const session = await getSession();
  if (!session?.user) redirect("/login");
  const { id, name, email } = session.user;
  return { id, name, email };
}
