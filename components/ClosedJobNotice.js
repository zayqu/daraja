import Link from "next/link";
import ContentPage from "@/components/ContentPage";
import { sectorGuideForCategory } from "@/lib/sector-guides";
import { WHATSAPP_CHANNEL_URL } from "@/lib/site-config";

function formatDate(value) {
  if (!value) return null;
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Africa/Dar_es_Salaam",
  });
}

export default function ClosedJobNotice({ job }) {
  const closedOn = formatDate(job.deadline);
  const sector = sectorGuideForCategory(job.category);
  const categoryHref = job.category
    ? `/jobs?category=${encodeURIComponent(job.category)}`
    : "/jobs";

  return (
    <ContentPage
      title="This job has closed"
      description={`${job.title} at ${job.company} is no longer accepting applications.`}
    >
      <h2>{job.title}</h2>
      <p>
        {job.company}
        {job.location ? ` · ${job.location}` : ""}
        {closedOn ? ` · Application deadline: ${closedOn}` : ""}
      </p>
      <p>
        This vacancy is no longer open, so Daraja has removed the application
        link. New opportunities are added every day.
      </p>

      <h2>Find similar opportunities</h2>
      <ul>
        {job.category && (
          <li>
            <Link href={categoryHref}>Current {job.category} jobs</Link>
          </li>
        )}
        <li>
          <Link href="/jobs">All current jobs in Tanzania</Link>
        </li>
        {sector && (
          <li>
            <Link href={`/sectors/${sector.slug}`}>
              What employers in {sector.category} look for
            </Link>
          </li>
        )}
        <li>
          <Link href="/career-guides">Career guides for your next application</Link>
        </li>
      </ul>

      <h2>Never miss the next one</h2>
      <p>
        <a href={WHATSAPP_CHANNEL_URL} target="_blank" rel="noopener noreferrer">
          Follow Daraja Jobs on WhatsApp
        </a>{" "}
        or <Link href="/account/alerts">set up job alerts</Link> to hear about new
        vacancies as soon as they are published.
      </p>
    </ContentPage>
  );
}
