import { notFound, redirect } from "next/navigation";
import AdminJobForm from "@/components/AdminJobForm";
import AdminTabs from "@/components/AdminTabs";
import SiteNav from "@/components/SiteNav";
import PageHero from "@/components/ui/PageHero";
import SurfaceCard from "@/components/ui/SurfaceCard";
import WorkspaceShell from "@/components/ui/WorkspaceShell";
import { applyFieldsFrom, deadlineFieldFrom } from "@/lib/admin-job-input";
import { getActor, isAdmin } from "@/lib/employer-access";
import prisma from "@/lib/prisma";
import styles from "../../../portal.module.css";

export const metadata = { title: "Edit vacancy | Daraja admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminEditJobPage({ params }) {
  const { id } = await params;
  const actor = await getActor();
  if (!actor) redirect(`/auth/signin?callbackUrl=/admin/jobs/${encodeURIComponent(id)}`);
  if (!isAdmin(actor)) notFound();

  const job = await prisma.job.findUnique({ where: { id } });
  if (!job) notFound();

  const initial = {
    title: job.title,
    company: job.company,
    location: job.location,
    category: job.category,
    type: job.type || "",
    salary: job.salary || "",
    deadline: deadlineFieldFrom(job.deadline),
    description: job.description,
    visible: job.active && job.moderationStatus === "PUBLISHED",
    ...applyFieldsFrom(job.applicationUrl || job.sourceUrl),
  };
  const sourceNote = job.source === "daraja"
    ? ""
    : `Collected automatically from ${job.source}. After you save, the scraper keeps your version.`;

  return (
    <div className={styles.page}>
      <SiteNav />
      <main id="main-content">
        <PageHero eyebrow="Administration" title="Edit vacancy." description={`${job.title} · ${job.company}`} />
        <WorkspaceShell className={styles.formScope}>
          <AdminTabs />
          <SurfaceCard className={styles.formCard}>
            <AdminJobForm jobId={job.id} initial={initial} sourceNote={sourceNote} />
          </SurfaceCard>
        </WorkspaceShell>
      </main>
    </div>
  );
}
