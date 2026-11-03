import ContentPage from "@/components/ContentPage";

const channelUrl = "https://whatsapp.com/channel/0029Vanw1OQ1CYoYdxl32g3V";
const subject = encodeURIComponent("DARAJA recruitment advertising pilot enquiry");
const body = encodeURIComponent(
  "Hello DARAJA,\n\nOrganisation:\nOfficial website:\nContact person and work email:\nVacancy title:\nOfficial vacancy URL:\nApplication deadline:\n\nWe would like to discuss the employer pilot.\n"
);
const enquiryHref = `mailto:jobs@alerts.daraja.co.tz?subject=${subject}&body=${body}`;

export const metadata = {
  title: "Recruitment advertising pilot | DARAJA",
  description:
    "A measured, no-obligation recruitment distribution pilot for verified Tanzanian employers.",
  alternates: { canonical: "/advertise" },
};

export default function AdvertisePage() {
  return (
    <ContentPage
      title="Your vacancy deserves the right audience."
      description="DARAJA helps Tanzanian employers distribute real vacancies to people who follow employment opportunities. We are inviting three employers to test the service before our paid launch."
    >
      <h2>Why try DARAJA?</h2>
      <p>
        Our WhatsApp Channel had 10,166 followers as at 2 November 2026, with
        99.7% of followers based in Tanzania. A typical job post receives
        approximately 1,000–3,000 views in its first 24 hours. These are
        historical channel figures, not a forecast for your vacancy.
      </p>
      <p>
        <a href={channelUrl} target="_blank" rel="noopener noreferrer">
          View the DARAJA WhatsApp Channel
        </a>
      </p>

      <h2>What is included in the pilot?</h2>
      <ul>
        <li>Review of your organisation, vacancy and official application destination.</li>
        <li>Preparation and publication of one approved vacancy on the channel.</li>
        <li>A tracked link to the Daraja vacancy page where available.</li>
        <li>A summary of channel views after 24 hours and seven days.</li>
        <li>A request for voluntary employer feedback on applications and relevance.</li>
      </ul>
      <p>
        <strong>Pilot fee: TZS 0.</strong> No long-term commitment. Participation
        is subject to verification, editorial approval and available pilot slots.
        Views, clicks, applications, shortlisted candidates and hires are
        different measures; none is guaranteed.
      </p>

      <h2>How to participate</h2>
      <p>
        Send your organisation name, official website, vacancy title, official
        vacancy link, deadline and work email. We will review eligibility
        before confirming a placement.
      </p>
      <p>
        <a href={enquiryHref}>Request a recruitment pilot placement</a>
      </p>

      <h2>Important for candidates</h2>
      <p>
        DARAJA does not charge jobseekers to view or apply for vacancies.
        Candidates apply through the employer's official application route.
        Please do not send CVs or identity documents to the pilot enquiry email.
      </p>
    </ContentPage>
  );
}
