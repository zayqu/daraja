import { notFound, redirect } from "next/navigation";
import { getActor, isAdmin } from "@/lib/employer-access";

// Every /admin page calls this itself (layouts are not re-checked on client
// navigation). Signed-out visitors go to sign in; everyone else who is not an
// administrator sees a plain 404 so the panel is not advertised.
export async function requireAdminPage(path = "/admin") {
  const actor = await getActor();
  if (!actor) redirect(`/auth/signin?callbackUrl=${encodeURIComponent(path)}`);
  if (!isAdmin(actor)) notFound();
  return actor;
}
