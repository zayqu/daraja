import ContentPage from "@/components/ContentPage";

export const metadata = {
  title: "Terms of Use",
  description: "Terms governing use of the Daraja Jobs platform.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <ContentPage
      title="Terms of Use"
      description="Last updated: 28 July 2026"
    >
      <h2>Using the service</h2>
      <p>
        Daraja provides job-discovery information for lawful personal and
        recruitment use. Users must not disrupt the service, misuse personal
        information, submit deceptive vacancies or attempt unauthorised access.
      </p>

      <h2>Job information</h2>
      <p>
        Daraja takes reasonable steps to present current and useful
        information, but employers and external sources control vacancy details.
        Candidates remain responsible for confirming eligibility, deadlines and
        application instructions before submitting an application.
      </p>

      <h2>External services</h2>
      <p>
        Application links may open employer websites, email services or
        recruitment platforms. Those services operate under their own terms and
        privacy policies. Daraja is not responsible for their availability or
        hiring decisions.
      </p>

      <h2>Candidate safety</h2>
      <p>
        Daraja does not charge candidates to browse or apply. Never share
        passwords, one-time codes or unnecessary financial information with a
        recruiter. Suspicious listings should be reported promptly.
      </p>

      <h2>Changes and availability</h2>
      <p>
        Daraja may correct, suspend or remove content and may update these terms
        as the platform develops. Continued use after an update means the user
        accepts the revised terms.
      </p>
    </ContentPage>
  );
}
