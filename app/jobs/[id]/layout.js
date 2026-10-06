import { permanentRedirect } from "next/navigation";
import { findPublicJob } from "@/lib/public-job";

export async function generateMetadata({ params }) {
  const { id } = await params;
  const job = await findPublicJob(id);

  if (!job) {
    return {
      title: "Job Not Found",
      robots: {
        index: false,
        follow: false,
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
  const job = await findPublicJob(id);

  if (job && id !== job.slug) {
    permanentRedirect(`/jobs/${job.slug}`);
  }

  return children;
}
