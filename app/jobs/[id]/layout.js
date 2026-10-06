import { permanentRedirect } from "next/navigation";
import { findPublicJob } from "@/lib/public-job";

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
    return {
      title: "Job Opportunity | Daraja",
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
    title: job.title,
    description,
    alternates: {
      canonical: `/jobs/${job.slug}`,
    },
    openGraph: {
      title: `${job.title} | Daraja`,
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

  return children;
}
