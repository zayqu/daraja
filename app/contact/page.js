import ContentPage from "@/components/ContentPage";

export const metadata = {
  title: "Contact Daraja Jobs",
  description: "Contact Daraja about job listings, corrections and privacy.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <ContentPage
      title="Contact Daraja Jobs"
      description="Report an incorrect listing, request a correction or contact us about privacy."
    >
      <h2>Email</h2>
      <p>
        <a href="mailto:jobs@alerts.daraja.co.tz">
          jobs@alerts.daraja.co.tz
        </a>
      </p>
      <p>
        Include the job title, employer and Daraja page URL when reporting a
        vacancy. Do not email CVs, identity documents or application materials
        to this address unless Daraja is explicitly named as the recruiter.
      </p>

      <h2>Application support</h2>
      <p>
        Employers control their own recruitment processes. Questions about an
        application, interview or hiring decision should be sent directly to
        the employer using the contact information in the official vacancy.
      </p>
    </ContentPage>
  );
}
