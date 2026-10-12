import { notFound } from "next/navigation";
import JobDetailPageClient from "./JobDetailPageClient";
import { employerPortalEnabled } from "@/lib/features";
import { findPublicJob, serializePublicJob } from "@/lib/public-job";
import { absoluteSiteUrl } from "@/lib/site-config";
import { buildJobPostingJsonLd, serializeJsonLd } from "@/lib/job-seo";

export default async function JobDetailPage({ params }) {
  const { id } = await params;
  let job = null;
  let loadFailed = false;

  try {
    job = await findPublicJob(id);
  } catch (error) {
    loadFailed = true;
    console.error("Job detail initial read failed:", error);
  }

  if (!job && !loadFailed) notFound();

  const jobPosting = job
    ? buildJobPostingJsonLd(job, absoluteSiteUrl(`/jobs/${job.slug}`))
    : null;

  return (
    <>
      {jobPosting && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(jobPosting) }}
        />
      )}
      <JobDetailPageClient
        initialJob={serializePublicJob(job)}
        showEmployerCta={employerPortalEnabled()}
      />
    </>
  );
}
