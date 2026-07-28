import Link from "next/link";

export const metadata = { title: "Check your email" };

export default function VerifyRequestPage() {
  return (
    <main id="main-content" className="message-page">
      <section>
        <p className="eyebrow">Secure sign-in</p>
        <h1>Check your email</h1>
        <p>
          We sent a one-time sign-in link. Open it in the same browser to access
          your candidate account. The link expires automatically.
        </p>
        <Link href="/jobs">Return to jobs</Link>
      </section>
      <style>{`
        .message-page { min-height: 70vh; padding: 4rem 1.25rem; background: #f7f8fa; color: #1b2a3f; }
        section { max-width: 520px; margin: auto; padding: 2rem; background: #fff; border: 1px solid #e4e7ec; border-radius: 12px; }
        .eyebrow { color: #087f6c; font-size: .72rem; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
        h1 { margin: .4rem 0; }
        p { color: #667085; line-height: 1.65; }
        a { display: inline-block; margin-top: 1rem; color: #087f6c; font-weight: 700; }
      `}</style>
    </main>
  );
}
