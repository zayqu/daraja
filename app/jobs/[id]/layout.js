import prisma from "@/lib/prisma";
import { permanentRedirect } from "next/navigation";

async function findActiveJob(identifier, select) {
  return prisma.job.findFirst({
    where: {
      active: true,
      OR: [
        { id: identifier },
        { slug: identifier },
      ],
    },
    select,
  });
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
