import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, authProviders } from "@/auth";
import AuthLayout from "@/components/auth/AuthLayout";
import GoogleButton from "@/components/auth/GoogleButton";
import LinkedInButton from "@/components/auth/LinkedInButton";
import SignupForm from "@/components/auth/SignupForm";
import { employerPortalEnabled } from "@/lib/features";
import { roleHome } from "@/lib/platform-roles";
import styles from "../auth.module.css";

export const metadata = {
  title: "Create account | Daraja",
  description: "Create a free Daraja account to find work or hire in Tanzania.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function SignUpPage({ searchParams }) {
  const params = await searchParams;
  const employerEnabled = employerPortalEnabled();
  const session = await auth();
  if (session?.user) redirect(roleHome(session.user.role, { employerPortal: employerEnabled }));

  const googleEnabled = authProviders.includes("google");
  const linkedinEnabled = authProviders.includes("linkedin");

  return (
    <AuthLayout
      title="Create your free Daraja account."
      intro="One account for your job search in Tanzania. Employers can post vacancies after a quick verification."
    >
      <h2>Create account</h2>
      <p className={styles.lead}>It takes less than a minute.</p>

      <SignupForm
        employerEnabled={employerEnabled}
        initialType={params?.type === "employer" ? "employer" : "candidate"}
        socialCandidate={
          <>
            {linkedinEnabled ? (
              <LinkedInButton
                callbackUrl="/account"
                label="Sign up with LinkedIn"
                withDivider={!googleEnabled}
              />
            ) : null}
            {googleEnabled ? <GoogleButton callbackUrl="/account" label="Sign up with Google" /> : null}
          </>
        }
        socialEmployer={
          googleEnabled ? <GoogleButton callbackUrl="/employer" label="Sign up with Google" /> : null
        }
      />

      <p className={styles.switchRow}>
        Already have an account? <Link href="/auth/signin">Sign in</Link>
      </p>
      <p className={styles.terms}>
        By creating an account, you agree to Daraja&apos;s <Link href="/terms">Terms</Link> and
        acknowledge our <Link href="/privacy">Privacy policy</Link>.
      </p>
    </AuthLayout>
  );
}
