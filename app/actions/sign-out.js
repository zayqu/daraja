"use server";

import { signOut } from "@/auth";

// The one sign-out action behind every "Sign out" button: the dashboard
// sidebar, the phone "More" sheet and the account settings page.
export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}
