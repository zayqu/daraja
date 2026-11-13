import { permanentRedirect } from "next/navigation";
import { findClosedPublicJob, findPublicJob } from "@/lib/public-job";
import { buildJobSearchTitle } from "@/lib/job-seo";

async function safeFindPublicJob(id) {
  try {
    return await findPublicJob(id);
  } catch (error) {
    console.error("Job detail layout read failed:", error);
    return null;
  }
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const job = await safeFindPublicJob(id);

  if (!job) {
    const closedJob = await findClosedPublicJob(id);
    if (closedJob) {
      return {
        title: { absolute: `Closed: ${closedJob.title} at ${closedJob.company} | Daraja` },
        robots: { index: false, follow: true },
      };
    }
    return {
      title: "Job Opportunity",
      robots: {
        index: false,
        follow: true,
      },
    };
  }

  const description = `${job.title} at ${job.company}. ${job.description}`
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);

  return {
    // Absolute so search results show role, employer and location.
    title: { absolute: buildJobSearchTitle(job) },
    description,
    alternates: {
      canonical: `/jobs/${job.slug}`,
    },
    openGraph: {
      title: buildJobSearchTitle(job),
      description,
      url: `/jobs/${job.slug}`,
      type: "article",
    },
  };
}

export default async function JobDetailLayout({ children, params }) {
  const { id } = await params;
  const job = await safeFindPublicJob(id);

  if (job && id !== job.slug) {
    permanentRedirect(`/jobs/${job.slug}`);
  }

  if (!job) {
    const closedJob = await findClosedPublicJob(id);
    if (closedJob && id !== closedJob.slug) {
      permanentRedirect(`/jobs/${closedJob.slug}`);
    }
  }

  return children;
}
