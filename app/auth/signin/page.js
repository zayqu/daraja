import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, authProviders, signIn } from "@/auth";

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
    <main id="main-content" className="auth-page">
      <section className="auth-card" aria-labelledby="signin-title">
        <Link href="/jobs" className="brand">DARAJA</Link>
        <p className="eyebrow">Candidate account</p>
        <h1 id="signin-title">Sign in to manage job alerts</h1>
        <p className="intro">
          Save precise career preferences and receive only relevant vacancies.
          Browsing and applying for jobs remains open without an account.
        </p>

        {googleEnabled && (
          <form action={async () => {
            "use server";
            await signIn("google", { redirectTo: callbackUrl });
          }}>
            <button className="google-button" type="submit">Continue with Google</button>
          </form>
        )}

        {googleEnabled && emailEnabled && <div className="divider"><span>or</span></div>}

        {emailEnabled && (
          <form action={async (formData) => {
            "use server";
            await signIn("resend", formData);
          }}>
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
            <button type="submit">Email me a secure sign-in link</button>
          </form>
        )}

        {!googleEnabled && !emailEnabled && (
          <p className="notice" role="status">
            Candidate sign-in is temporarily unavailable while secure providers
            are being configured.
          </p>
        )}
        <p className="terms">
          By continuing, you agree to Daraja&apos;s <Link href="/terms">Terms</Link>{" "}
          and acknowledge the privacy information on our <Link href="/about">About page</Link>.
        </p>
      </section>
      <style>{`
        .auth-page { min-height: 75vh; padding: 4rem 1.25rem; background: #f7f8fa; color: #1b2a3f; }
        .auth-card { max-width: 480px; margin: auto; padding: 2rem; background: white; border: 1px solid #e4e7ec; border-radius: 12px; box-shadow: 0 12px 36px rgba(27,42,63,.08); }
        .brand { color: #087f6c; font-size: 1.1rem; font-weight: 800; letter-spacing: .12em; text-decoration: none; }
        .eyebrow { margin: 1.5rem 0 .4rem; color: #087f6c; font-size: .72rem; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
        h1 { margin: 0; font-size: 1.75rem; line-height: 1.25; }
        .intro { color: #667085; line-height: 1.65; }
        form { margin-top: 1.25rem; }
        label { display: block; margin-bottom: .4rem; font-size: .8rem; font-weight: 700; }
        input { width: 100%; min-height: 48px; padding: 0 .85rem; border: 1.5px solid #cfd6df; border-radius: 7px; font: inherit; }
        button { width: 100%; min-height: 48px; margin-top: .75rem; padding: .75rem 1rem; border: 0; border-radius: 7px; background: #00c9a7; color: #1b2a3f; font: inherit; font-weight: 750; cursor: pointer; }
        .google-button { margin-top: 0; background: #1b2a3f; color: white; }
        .divider { display: flex; margin: 1.25rem 0 0; align-items: center; gap: .75rem; color: #98a2b3; font-size: .75rem; }
        .divider::before, .divider::after { content: ""; height: 1px; flex: 1; background: #e4e7ec; }
        .notice { padding: 1rem; border-radius: 7px; background: #fff7e6; color: #7a4b00; }
        .terms { margin: 1.25rem 0 0; color: #667085; font-size: .72rem; line-height: 1.55; }
        .terms a { color: #087f6c; }
        input:focus-visible, button:focus-visible, a:focus-visible { outline: 3px solid #f59e0b; outline-offset: 2px; }
      `}</style>
    </main>
  );
}
