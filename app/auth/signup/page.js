import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, authProviders } from "@/auth";
import AuthLayout from "@/components/auth/AuthLayout";
import ProviderButton from "@/components/auth/ProviderButton";
import SignupForm from "@/components/auth/SignupForm";
import { candidateCareerEnabled, employerPortalEnabled } from "@/lib/features";
import { roleHome } from "@/lib/platform-roles";
import { safeRedirectPath } from "@/lib/password-auth";
import styles from "../auth.module.css";
import { getServerT } from "@/lib/i18n-server";

export const metadata = {
  title: "Create account",
  description: "Create a free Daraja account to find work or hire in Tanzania.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const SOCIAL_ORDER = ["google", "apple", "linkedin"];

export default async function SignUpPage({ searchParams }) {
  const params = await searchParams;
  const employerEnabled = employerPortalEnabled();
  // New candidates continue straight into private profile setup (onboarding).
  // Coming from "Apply with Daraja CV" returns there instead.
  const candidateStart =
    safeRedirectPath(params?.callbackUrl, "") || (candidateCareerEnabled() ? "/account/profile" : "/account");
  const session = await auth();
  if (session?.user) redirect(roleHome(session.user.role, { employerPortal: employerEnabled }));

  const { t } = await getServerT();
  const social = SOCIAL_ORDER.filter((provider) => authProviders.includes(provider));

  return (
    <AuthLayout>
      <h1 className={styles.title}>{t("Create your free account")}</h1>
      <p className={styles.lead}>{t("It takes less than a minute.")}</p>

      <SignupForm
        employerEnabled={employerEnabled}
        initialType={params?.type === "employer" ? "employer" : "candidate"}
        hasSocial={social.length > 0}
        socialCandidate={social.map((provider) => (
          <ProviderButton
            key={provider}
            provider={provider}
            callbackUrl={candidateStart}
            label={`Sign up with ${provider === "linkedin" ? "LinkedIn" : provider === "apple" ? "Apple" : "Google"}`}
          />
        ))}
        socialEmployer={social.includes("google") ? (
          <ProviderButton provider="google" callbackUrl="/employer" label="Sign up with Google" />
        ) : null}
      />

      <p className={styles.switchRow}>
        {t("Already have an account?")} <Link href="/auth/signin">{t("Sign in")}</Link>
      </p>
    </AuthLayout>
  );
}
