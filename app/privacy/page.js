import ContentPage from "@/components/ContentPage";

export const metadata = {
  title: "Privacy Policy",
  description: "How Daraja Jobs handles usage information, cookies and advertising.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <ContentPage
      title="Privacy Policy"
      description="How Daraja handles usage information, optional analytics, advertising and job-alert data."
    >
      <p>Last updated: 28 July 2026</p>

      <h2>Information we process</h2>
      <p>
        Daraja Jobs may process basic technical information such as browser type,
        device type, pages visited and approximate location. This helps us keep the
        service reliable, understand which vacancies are useful and improve the
        candidate experience.
      </p>

      <h2>Job applications</h2>
      <p>
        Daraja does not receive applications submitted through an employer website
        or a candidate&apos;s email application. Selecting Apply sends the candidate
        to the stated official application destination or opens their email service.
        The destination&apos;s own privacy policy then applies.
      </p>

      <h2>Cookies and advertising</h2>
      <p>
        Daraja may use cookies or similar technologies for security, analytics and
        advertising. If Google advertising is enabled, Google and its partners may
        use cookies to show and measure ads in accordance with Google&apos;s policies.
        Optional analytics and advertising do not load until a visitor accepts
        them. Visitors can decline without losing access to job search or
        application links, and can reopen their privacy choices at any time.
      </p>

      <h2>Job-alert subscriptions</h2>
      <p>
        When a visitor subscribes to email alerts, Daraja stores the submitted email
        address, selected job interests, consent time and notification history so
        that relevant vacancy updates can be delivered and duplicate messages can
        be avoided.
      </p>

      <h2>Data retention and security</h2>
      <p>
        We retain only information reasonably required to operate and protect the
        service. We use practical technical and organizational safeguards, but no
        internet service can guarantee absolute security.
      </p>

      <h2>Updates</h2>
      <p>
        This policy may be updated when Daraja introduces new features, analytics or
        advertising services. The latest revision date will be shown on this page.
      </p>
    </ContentPage>
  );
}
