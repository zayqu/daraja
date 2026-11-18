import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { signOutAction } from "@/app/actions/sign-out";
import PasswordResetButton from "@/components/PasswordResetButton";
import { ListCard, PageHeader } from "@/components/dashboard/DashboardUi";
import dash from "@/components/dashboard/dashboard.module.css";
import { ROLE_LABELS } from "@/lib/platform-roles";
import prisma from "@/lib/prisma";

export const metadata = {
  title: "Settings",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

const PROVIDERS = { google: "Google", linkedin: "LinkedIn" };

// Account settings for every signed-in role: sign-in details, password,
// notifications, data and signing out.
export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/account/settings");

  // Only whether a password exists is needed; the hash itself is never loaded.
  const [user, hasPassword] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true, role: true, accounts: { select: { provider: true } } },
    }),
    prisma.user.count({ where: { id: session.user.id, password: { not: null } } }).then(Boolean),
  ]);
  if (!user) redirect("/auth/signin?callbackUrl=/account/settings");

  const methods = [
    ...(hasPassword ? ["Email and password"] : []),
    ...[...new Set(user.accounts.map((account) => PROVIDERS[account.provider] || account.provider))],
  ];

  return (
    <>
      <PageHeader title="Settings" description="Your sign-in details, password, notifications and data." />

      <div className={dash.overviewBottom}>
        <ListCard title="Sign-in">
          <dl className={dash.detailList}>
            <div>
              <dt>Email</dt>
              <dd>{user.email}</dd>
            </div>
            <div>
              <dt>Account type</dt>
              <dd>{ROLE_LABELS[user.role] || user.role}</dd>
            </div>
            <div>
              <dt>Signs in with</dt>
              <dd>{methods.length ? methods.join(", ") : "Email link"}</dd>
            </div>
          </dl>
        </ListCard>

        <ListCard title="Password">
          <p className={dash.help}>
            {hasPassword
              ? "Set a new password using a one-time link sent to your email."
              : "Add a password so you can also sign in without Google or LinkedIn. We'll email you a one-time link."}
          </p>
          <div className={dash.cardFooter}>
            <PasswordResetButton email={user.email} />
          </div>
        </ListCard>

        <ListCard title="Notifications">
          <p className={dash.help}>Choose which jobs Daraja emails you about, and see account updates.</p>
          <div className={dash.cardFooter}>
            <div className={dash.headerActions}>
              <Link className={dash.button} href="/account/alerts">Job alerts</Link>
              <Link className={dash.button} href="/account/notifications">Notifications</Link>
            </div>
          </div>
        </ListCard>

        <ListCard title="Privacy and data">
          <p className={dash.help}>
            Download everything linked to your account, or delete your account permanently.
          </p>
          <div className={dash.cardFooter}>
            <div className={dash.headerActions}>
              <a className={dash.button} href="/api/account/export">Download my data</a>
              <Link className={dash.buttonDanger} href="/account/privacy">Delete my account</Link>
            </div>
          </div>
        </ListCard>
      </div>

      <ListCard title="Sign out">
        <p className={dash.help}>Sign out of Daraja on this device.</p>
        <form action={signOutAction} className={dash.cardFooter}>
          <button type="submit" className={dash.button}>Sign out</button>
        </form>
      </ListCard>
    </>
  );
}
