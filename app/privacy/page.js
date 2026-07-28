import Link from "next/link";

export const metadata = {
  title: "Privacy Policy",
  description: "How Daraja Jobs handles usage information, cookies and advertising.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <main
      id="main-content"
      style={{
        maxWidth: "760px",
        margin: "0 auto",
        padding: "3rem 1.25rem 5rem",
        color: "#1B2A3F",
        fontFamily: "Arial, sans-serif",
        lineHeight: 1.75,
      }}
    >
      <Link href="/" style={{ color: "#087F6C" }}>← Back to Daraja Jobs</Link>
      <h1 style={{ margin: "1.5rem 0 0.5rem", lineHeight: 1.25 }}>Privacy Policy</h1>
      <p style={{ color: "#667085" }}>Last updated: 28 July 2026</p>

      <h2 style={{ marginTop: "2rem" }}>Information we process</h2>
      <p>
        Daraja Jobs may process basic technical information such as browser type,
        device type, pages visited and approximate location. This helps us keep the
        service reliable, understand which vacancies are useful and improve the
        candidate experience.
      </p>

      <h2 style={{ marginTop: "2rem" }}>Job applications</h2>
      <p>
        Daraja does not receive applications submitted through an employer website
        or a candidate&apos;s email application. Selecting Apply sends the candidate
        to the stated official application destination or opens their email service.
        The destination&apos;s own privacy policy then applies.
      </p>

      <h2 style={{ marginTop: "2rem" }}>Cookies and advertising</h2>
      <p>
        Daraja may use cookies or similar technologies for security, analytics and
        advertising. If Google advertising is enabled, Google and its partners may
        use cookies to show and measure ads in accordance with Google&apos;s policies.
        Optional analytics and advertising do not load until a visitor accepts
        them. Visitors can decline without losing access to job search or
        application links, and can reopen their privacy choices at any time.
      </p>

      <h2 style={{ marginTop: "2rem" }}>Job-alert subscriptions</h2>
      <p>
        When a visitor subscribes to email alerts, Daraja stores the submitted email
        address, selected job interests, consent time and notification history so
        that relevant vacancy updates can be delivered and duplicate messages can
        be avoided.
      </p>

      <h2 style={{ marginTop: "2rem" }}>Data retention and security</h2>
      <p>
        We retain only information reasonably required to operate and protect the
        service. We use practical technical and organizational safeguards, but no
        internet service can guarantee absolute security.
      </p>

      <h2 style={{ marginTop: "2rem" }}>Updates</h2>
      <p>
        This policy may be updated when Daraja introduces new features, analytics or
        advertising services. The latest revision date will be shown on this page.
      </p>
    </main>
  );
}
