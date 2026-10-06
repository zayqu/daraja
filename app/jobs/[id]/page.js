import { notFound } from "next/navigation";
import JobDetailPageClient from "./JobDetailPageClient";
import { employerPortalEnabled } from "@/lib/features";
import { findPublicJob, serializePublicJob } from "@/lib/public-job";

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

  return (
    <JobDetailPageClient
      initialJob={serializePublicJob(job)}
      showEmployerCta={employerPortalEnabled()}
    />
  );
}
