import Link from "next/link";
import ContentPage from "@/components/ContentPage";
import { loadSiteSettings, employerPortalEnabled, siteSetting } from "@/lib/features";
import { WHATSAPP_CHANNEL_URL } from "@/lib/site-config";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Recruitment advertising pilot | DARAJA",
  description:
    "A measured, no-obligation recruitment distribution pilot for verified Tanzanian employers.",
  alternates: { canonical: "/advertise" },
};

export default async function AdvertisePage() {
  await loadSiteSettings();
  const employerEnabled = employerPortalEnabled();
  const followers = siteSetting("channel.followers");
  const followersLabel = Number.isSafeInteger(followers) && followers >= 1000
    ? `${Math.floor(followers / 1000)}k+`
    : Number.isSafeInteger(followers) && followers >= 0
      ? followers.toLocaleString("en-GB")
      : "11k+";
  return (
    <ContentPage
      title="Your vacancy deserves the right audience."
      description="DARAJA distributes approved vacancies to its audience. Recruitment agencies and employers retain their own application websites, candidate relationships and hiring decisions."
    >
      <h2>Why try DARAJA?</h2>
      <p>
        Our WhatsApp Channel has {followersLabel} followers, 99.7% of whom
        are based in Tanzania. A typical job post receives approximately
        1,000–3,000 views in its first 24 hours. These figures come from
        historical Channel insights, not a forecast for your vacancy.
      </p>
      <p>
        <a href={WHATSAPP_CHANNEL_URL} target="_blank" rel="noopener noreferrer">
          View the DARAJA WhatsApp Channel
        </a>
      </p>

      <h2>What is included in the pilot?</h2>
      <ul>
        <li>Review of your organisation, vacancy and official application destination.</li>
        <li>Preparation and publication of one approved vacancy on the channel.</li>
        <li>An approved link directly to your official careers website or ATS; an Ajira information page is optional.</li>
        <li>A summary of channel views after 24 hours and seven days.</li>
        <li>A request for voluntary partner feedback on applications and relevance. We do not collect candidates or act as a recruiter.</li>
      </ul>
      <p>
        <strong>Pilot fee: TZS 0.</strong> No long-term commitment. Participation
        is subject to verification, editorial approval and available pilot slots.
        Views, clicks, applications, shortlisted candidates and hires are
        different measures; none is guaranteed.
      </p>

      <h2>How to participate</h2>
      {employerEnabled ? (
        <>
          <p>
            Register through the secure employer workspace, provide your organisation
            details and submit an active vacancy for verification. Our team will
            review eligible submissions and confirm pilot placements individually.
            Submitting does not guarantee a pilot slot.
          </p>
          <p>
            <Link href="/employer">Open employer workspace to submit a vacancy</Link>
          </p>
        </>
      ) : (
        <p>
          Pilot enrolment is not open yet. Employer submissions are currently
          disabled; please check back once the verified employer workspace is available.
        </p>
      )}

      <h2>Important for candidates</h2>
      <p>
        DARAJA does not charge jobseekers to view or apply for vacancies.
        Candidates apply through the authorised employer or recruitment agency&apos;s official application route.
        Do not submit CVs or identity documents through an employer enquiry.
      </p>
    </ContentPage>
  );
}
