import ContentPage from "@/components/ContentPage";

export const metadata = {
  title: "Job Listing and Editorial Policy",
  description:
    "How Daraja sources, reviews, updates and corrects Tanzania job listings.",
  alternates: { canonical: "/editorial-policy" },
};

export default function EditorialPolicyPage() {
  return (
    <ContentPage
      title="Job Listing and Editorial Policy"
      description="The standards used to publish and maintain vacancies on Daraja."
    >
      <h2>Source standards</h2>
      <p>
        Daraja prioritises employer career pages, government portals and
        established vacancy sources. A listing must identify a real role,
        employer and usable application destination. Generic vacancy roundups
        are split into individual roles when reliable role details are present.
      </p>

      <h2>Application destinations</h2>
      <p>
        Apply actions should lead to the employer&apos;s application form,
        instructed email address or official recruitment system. When a source
        requires an account before applying, Daraja may link to that source&apos;s
        application page.
      </p>

      <h2>Accuracy and expiry</h2>
      <p>
        Automated checks refresh listings and archive expired vacancies.
        Employers can change or remove opportunities without advance notice, so
        candidates should confirm the closing date and requirements on the
        official destination before applying.
      </p>

      <h2>Corrections</h2>
      <p>
        Material errors, unsafe links and expired listings can be reported
        through the Contact page. Daraja may correct, suspend or remove a
        listing when the source can no longer be verified.
      </p>

      <h2>No application fees</h2>
      <p>
        Daraja does not charge candidates to browse or apply for jobs. Be
        cautious if anyone asks for money, passwords or sensitive financial
        information in exchange for recruitment.
      </p>
    </ContentPage>
  );
}
