import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import PasswordResetButton from "@/components/PasswordResetButton";
import { ListCard, PageHeader } from "@/components/dashboard/DashboardUi";
import dash from "@/components/dashboard/dashboard.module.css";
import { MenuRows, SignOutButton } from "@/components/ui/MenuList";
import { AppearanceSetting } from "@/components/ThemeControls";
import LanguageSwitch from "@/components/LanguageSwitch";
import { cookies } from "next/headers";
import { LOCALE_COOKIE, normalizeLocale, translate } from "@/lib/i18n";
import { ROLE_LABELS } from "@/lib/platform-roles";
import { dashboardMenu } from "@/lib/dashboard-navigation";
import { candidateCareerEnabled, employerPortalEnabled } from "@/lib/features";
import prisma from "@/lib/prisma";

export const metadata = {
  title: "Account settings",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

const PROVIDERS = { google: "Google", linkedin: "LinkedIn" };

// Account settings for every signed-in role (Makarya pattern, D-038): sign-in
// and password, then a short list of account pages, and Sign out at the very
// bottom. Candidates and employers reach it from the gear on their Profile or
// Account page; admins from More.
export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/account/settings");

  // Only whether a password exists is needed; the hash itself is never loaded.
  const [user, hasPassword] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        email: true,
        role: true,
        accounts: { select: { provider: true } },
        employer: { select: { verificationStatus: true } },
      },
    }),
    prisma.user.count({ where: { id: session.user.id, password: { not: null } } }).then(Boolean),
  ]);
  if (!user) redirect("/auth/signin?callbackUrl=/account/settings");

  const locale = normalizeLocale((await cookies()).get(LOCALE_COOKIE)?.value);
  const t = (text) => translate(locale, text);
  const candidateCareer = candidateCareerEnabled();
  const menu = dashboardMenu(user.role, { employerPortal: employerPortalEnabled(), candidateCareer });
  const candidate = menu.role === "JOB_SEEKER";
  const employer = menu.role === "EMPLOYER";
  const suspended = user.employer?.verificationStatus === "SUSPENDED";
  const methods = [
    ...(hasPassword ? ["Email and password"] : []),
    ...[...new Set(user.accounts.map((account) => PROVIDERS[account.provider] || account.provider))],
  ];
  const rows = [
    ...(candidate && candidateCareer
      ? [{ href: "/account/profile/edit", label: "Personal information", icon: "user" }]
      : []),
    ...(employer && !suspended
      ? [{ href: "/employer/profile/edit", label: "Company details", icon: "employer" }]
      : []),
    ...(candidate
      ? [
          { href: "/account/alerts", label: "Job alerts", icon: "alert" },
          { href: "/account/notifications", label: "Notifications", icon: "bell" },
        ]
      : []),
    { href: "/account/privacy", label: "Privacy & data", hint: "Download or delete your data", icon: "privacy" },
    ...(menu.role !== "ADMIN" ? [{ href: "/contact", label: "Help & support", icon: "help" }] : []),
  ];
  const back = menu.accountTab.href && menu.accountTab.href !== "/account/settings" ? menu.accountTab : null;

  return (
    <>
      <PageHeader
        title="Account settings"
        description="Sign-in, password, alerts and your data."
        actions={back ? <Link className={dash.button} href={back.href}>Back to {back.label.toLowerCase()}</Link> : null}
      />

      {employer && !suspended ? (
        <section className={dash.promoCard} aria-label="Feature a vacancy">
          <strong>Get your vacancy seen first</strong>
          <p>Feature it on Ajira and the DARAJA WhatsApp Channel.</p>
          <Link className={dash.buttonPrimary} href="/advertise">Feature a vacancy</Link>
        </section>
      ) : null}

      <ListCard title="Login & security">
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
        <div className={dash.cardFooter}>
          <p className={dash.help}>
            {hasPassword
              ? "Set a new password with a one-time link sent to your email."
              : "Add a password so you can also sign in without Google or LinkedIn."}
          </p>
          <PasswordResetButton email={user.email} />
        </div>
      </ListCard>

      <ListCard title={t("Language")}>
        <div className={dash.cardFooter}>
          <p className={dash.help}>{t("Choose the language for menus and pages.")}</p>
          <LanguageSwitch full />
        </div>
      </ListCard>

      <ListCard title={t("Appearance")}>
        <div className={dash.cardFooter}>
          <p className={dash.help}>{t("Use your device setting, or always light or dark.")}</p>
          <AppearanceSetting />
        </div>
      </ListCard>

      <div className={dash.settingsList}>
        <MenuRows items={rows} />
        <SignOutButton />
      </div>
    </>
  );
}
