import { notFound } from "next/navigation";
import JobDetailPageClient from "./JobDetailPageClient";
import { employerPortalEnabled } from "@/lib/features";
import prisma from "@/lib/prisma";
import { findPublicJob, serializePublicJob } from "@/lib/public-job";

export default async function JobDetailPage({ params }) {
  const { id } = await params;
  const job = await findPublicJob(prisma, id);
  if (!job) notFound();

  return (
    <JobDetailPageClient
      initialJob={serializePublicJob(job)}
      showEmployerCta={employerPortalEnabled()}
    />
  );
}
