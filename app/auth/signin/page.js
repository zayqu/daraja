import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, authProviders } from "@/auth";
import AuthLayout from "@/components/auth/AuthLayout";
import GoogleButton from "@/components/auth/GoogleButton";
import LinkedInButton from "@/components/auth/LinkedInButton";
import LoginForm from "@/components/auth/LoginForm";
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
  OAuthAccountNotLinked: "This email already has a Daraja account. Sign in with your password.",
};

export default async function SignInPage({ searchParams }) {
  const params = await searchParams;
  const session = await auth();
  const home = roleHome(session?.user?.role, { employerPortal: employerPortalEnabled() });
  const callbackUrl = safeRedirectPath(params?.callbackUrl, "");
  if (session?.user) redirect(callbackUrl || home);

  const { t } = await getServerT();
  const googleEnabled = authProviders.includes("google");
  const linkedinEnabled = authProviders.includes("linkedin");
  const error = ERRORS[params?.error] || (params?.error ? "Sign-in failed. Please try again." : "");

  return (
    <AuthLayout
      title="Welcome back to Daraja."
      intro="Sign in to manage your applications, job alerts, vacancies or the Daraja admin panel."
    >
      <h2>{t("Sign in")}</h2>
      <p className={styles.lead}>{t("Use your email and password, or continue with Google or LinkedIn.")}</p>

      {linkedinEnabled ? (
        <LinkedInButton
          callbackUrl={callbackUrl || "/account"}
          withDivider={!googleEnabled}
        />
      ) : null}
      {googleEnabled ? <GoogleButton callbackUrl={callbackUrl || "/account"} /> : null}

      <LoginForm callbackUrl={callbackUrl} initialError={error} />

      <p className={styles.switchRow}>
        {t("New to Daraja?")} <Link href="/auth/signup">{t("Create an account")}</Link>
      </p>
      <p className={styles.terms}>
        {t("By continuing, you agree to Daraja's")} <Link href="/terms">{t("Terms")}</Link>{" "}
        {t("and acknowledge our")} <Link href="/privacy">{t("Privacy policy")}</Link>.
      </p>
    </AuthLayout>
  );
}
