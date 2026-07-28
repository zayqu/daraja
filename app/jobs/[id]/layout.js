import prisma from "@/lib/prisma";
import { permanentRedirect } from "next/navigation";
import legacySlug from "@/lib/legacy-job-slug";

const { findJobByLegacySlug } = legacySlug;

async function findActiveJob(identifier, select) {
  const job = await prisma.job.findFirst({
    where: {
      active: true,
      OR: [
        { id: identifier },
        { slug: identifier },
      ],
    },
    select,
  });
  if (job) return job;
  return findJobByLegacySlug(prisma, identifier, select);
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const job = await findActiveJob(id, {
    slug: true,
    title: true,
    company: true,
    description: true,
  });

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
  const job = await findActiveJob(id, {
    id: true,
    slug: true,
  });

  if (job && id !== job.slug) {
    permanentRedirect(`/jobs/${job.slug}`);
  }

  return children;
}
