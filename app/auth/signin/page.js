import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, authProviders } from "@/auth";
import AuthLayout from "@/components/auth/AuthLayout";
import GoogleButton from "@/components/auth/GoogleButton";
import LoginForm from "@/components/auth/LoginForm";
import { employerPortalEnabled } from "@/lib/features";
import { roleHome } from "@/lib/platform-roles";
import { safeRedirectPath } from "@/lib/password-auth";
import styles from "../auth.module.css";

export const metadata = {
  title: "Sign in | Daraja",
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

  const googleEnabled = authProviders.includes("google");
  const error = ERRORS[params?.error] || (params?.error ? "Sign-in failed. Please try again." : "");

  return (
    <AuthLayout
      title="Welcome back to Daraja."
      intro="Sign in to manage your applications, job alerts, vacancies or the Daraja admin panel."
    >
      <h2>Sign in</h2>
      <p className={styles.lead}>Use your email and password, or continue with Google.</p>

      {googleEnabled ? <GoogleButton callbackUrl={callbackUrl || "/account"} /> : null}

      <LoginForm callbackUrl={callbackUrl} initialError={error} />

      <p className={styles.switchRow}>
        New to Daraja? <Link href="/auth/signup">Create an account</Link>
      </p>
      <p className={styles.terms}>
        By continuing, you agree to Daraja&apos;s <Link href="/terms">Terms</Link> and
        acknowledge our <Link href="/privacy">Privacy policy</Link>.
      </p>
    </AuthLayout>
  );
}
