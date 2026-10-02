import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, authProviders, signIn } from "@/auth";
import PublicSiteNav from "@/components/PublicSiteNav";
import PageHero from "@/components/ui/PageHero";
import SurfaceCard from "@/components/ui/SurfaceCard";
import styles from "../auth.module.css";

function safeCallback(value) {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//")
    ? value
    : "/account/alerts";
}

export const metadata = {
  title: "Candidate sign in",
  description: "Sign in securely to manage personalised Daraja job alerts.",
};

export default async function SignInPage({ searchParams }) {
  const params = await searchParams;
  const callbackUrl = safeCallback(params?.callbackUrl);
  const session = await auth();
  if (session?.user) redirect(callbackUrl);

  const googleEnabled = authProviders.includes("google");
  const emailEnabled = authProviders.includes("resend");

  return (
    <div className={styles.page}>
      <PublicSiteNav />

      <main id="main-content">
        <PageHero
          eyebrow="Candidate account"
          title="Sign in when you need personalised Daraja tools."
          description="Browsing and applying for public jobs stays open without an account. Sign in only for alerts and protected account features."
          maxWidth="narrow"
          variant="overlap"
        />

        <div className={styles.cardWrap}>
          <SurfaceCard className={styles.card} aria-labelledby="signin-title">
            <div className={styles.cardHeader}>
              <Link href="/jobs" className={styles.brand}>DARAJA</Link>
              <h2 id="signin-title">Access your candidate account</h2>
              <p>
                Use Google or a verified one-time email link when the provider
                is configured.
              </p>
            </div>

            {googleEnabled && (
              <form
                className={styles.form}
                action={async () => {
                  "use server";
                  await signIn("google", { redirectTo: callbackUrl });
                }}
              >
                <button className={styles.google} type="submit">
                  Continue with Google
                </button>
              </form>
            )}

            {googleEnabled && emailEnabled && (
              <div className={styles.divider}><span>or</span></div>
            )}

            {emailEnabled && (
              <form
                className={styles.form}
                action={async (formData) => {
                  "use server";
                  await signIn("resend", formData);
                }}
              >
                <input type="hidden" name="redirectTo" value={callbackUrl} />
                <label htmlFor="email">Email address</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="name@example.com"
                  required
                />
                <button className={styles.primary} type="submit">
                  Email me a secure sign-in link
                </button>
              </form>
            )}

            {!googleEnabled && !emailEnabled && (
              <p className={styles.notice} role="status">
                Candidate sign-in is temporarily unavailable while secure
                providers are being configured.
              </p>
            )}

            <p className={styles.terms}>
              By continuing, you agree to Daraja&apos;s{" "}
              <Link href="/terms">Terms</Link> and acknowledge the privacy
              information on our <Link href="/privacy">Privacy page</Link>.
            </p>
          </SurfaceCard>
        </div>
      </main>
    </div>
  );
}
