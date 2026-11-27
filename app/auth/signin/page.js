import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, authProviders } from "@/auth";
import AuthLayout from "@/components/auth/AuthLayout";
import EmailOption from "@/components/auth/EmailOption";
import LoginForm from "@/components/auth/LoginForm";
import ProviderButton from "@/components/auth/ProviderButton";
import { employerPortalEnabled } from "@/lib/features";
import { roleHome } from "@/lib/platform-roles";
import { safeRedirectPath } from "@/lib/password-auth";
import styles from "../auth.module.css";
import { getServerT } from "@/lib/i18n-server";

export const metadata = {
  title: "Sign in",
  description: "Sign in to your Daraja account.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const ERRORS = {
  link: "That link has expired or was already used. Sign in, or request a new link.",
  AccessDenied: "This account cannot sign in. Contact Daraja support if you think this is a mistake.",
  OAuthAccountNotLinked: "This email is linked to another sign-in method. Use the method you previously used, or contact Daraja support.",
};

// Social options first (Google, Apple, then LinkedIn), email behind one button.
const SOCIAL_ORDER = ["google", "apple", "linkedin"];

export default async function SignInPage({ searchParams }) {
  const params = await searchParams;
  const session = await auth();
  const home = roleHome(session?.user?.role, { employerPortal: employerPortalEnabled() });
  const callbackUrl = safeRedirectPath(params?.callbackUrl, "");
  if (session?.user) redirect(callbackUrl || home);

  const { t } = await getServerT();
  const social = SOCIAL_ORDER.filter((provider) => authProviders.includes(provider));
  const error = ERRORS[params?.error] || (params?.error ? "Sign-in failed. Please try again." : "");

  return (
    <AuthLayout>
      <h1 className={styles.title}>{t("Sign in to Daraja")}</h1>
      <p className={styles.lead}>{t("Save jobs, get alerts and keep your CV ready.")}</p>

      <div className={styles.methods}>
        {social.map((provider) => (
          <ProviderButton key={provider} provider={provider} callbackUrl={callbackUrl || "/account"} />
        ))}
        {social.length > 0 ? <div className={styles.divider}><span>{t("or")}</span></div> : null}
        <EmailOption defaultOpen={Boolean(error) || social.length === 0}>
          <LoginForm callbackUrl={callbackUrl} initialError={error} />
        </EmailOption>
      </div>

      <p className={styles.switchRow}>
        {t("New to Daraja?")} <Link href="/auth/signup">{t("Create a free account")}</Link>
      </p>
    </AuthLayout>
  );
}
