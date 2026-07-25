import prisma from "@/lib/prisma";

export async function generateMetadata({ params }) {
  const { id } = await params;
  const job = await prisma.job.findFirst({
    where: {
      id,
      active: true,
    },
    select: {
      title: true,
      company: true,
      description: true,
    },
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
      canonical: `/jobs/${id}`,
    },
    openGraph: {
      title: `${job.title} | Daraja`,
      description,
      url: `/jobs/${id}`,
      type: "article",
    },
  };
}

export default function JobDetailLayout({ children }) {
  return children;
}
