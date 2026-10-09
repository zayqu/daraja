import { notFound, redirect } from "next/navigation";
import {
  employerPortalEnabled,
  getActor,
  isAdmin,
} from "@/lib/employer-access";
import AdminEmployerQueue from "@/components/AdminEmployerQueue";
import AdminJobReviewQueue from "@/components/AdminJobReviewQueue";
import EmployerPortalTabs from "@/components/EmployerPortalTabs";
import SiteNav from "@/components/SiteNav";
import PageHero from "@/components/ui/PageHero";
import WorkspaceShell from "@/components/ui/WorkspaceShell";
import SurfaceCard from "@/components/ui/SurfaceCard";
import prisma from "@/lib/prisma";
import styles from "../portal.module.css";

export const metadata = { title: "Moderation | Daraja" };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!employerPortalEnabled()) notFound();

  const actor = await getActor();
  if (!actor) redirect("/auth/signin?callbackUrl=/admin");
  if (!isAdmin(actor)) notFound();

  const jobFields = {
    id: true,
    title: true,
    company: true,
    location: true,
    source: true,
    sourceUrl: true,
    description: true,
    deadline: true,
    moderationNote: true,
  };
  const [pendingEmployers, liveJobs] = await Promise.all([
    prisma.employer.findMany({
      where: { verificationStatus: "PENDING" },
      orderBy: { createdAt: "asc" },
      take: 50,
      select: {
        id: true,
        companyName: true,
        industry: true,
        website: true,
        user: { select: { email: true } },
        _count: { select: { jobs: { where: { moderationStatus: "PENDING_REVIEW" } } } },
      },
    }),
    prisma.job.findMany({
      where: { moderationStatus: "PUBLISHED", active: true },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: jobFields,
    }),
  ]);
  const serializeJob = (job) => ({ ...job, deadline: job.deadline?.toISOString() ?? null });

  const pendingJobs = await prisma.job.findMany({
    where: { moderationStatus: "PENDING_REVIEW" },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: jobFields,
  });

  return (
    <div className={styles.page}>
      <SiteNav />

      <main id="main-content">
        <PageHero
          eyebrow="Protected administration"
          title="Verification and vacancy moderation."
          description="Review employer trust, make publication decisions and preserve an auditable moderation trail."
        />

        <WorkspaceShell className={styles.formScope}>
          <EmployerPortalTabs showAdmin />

          <section className={styles.summaryStrip}>
            <div>
              <span>Administrator</span>
              <strong>{actor.email}</strong>
            </div>
            <div>
              <span>Access level</span>
              <strong className={styles.statusVerified}>admin</strong>
            </div>
          </section>

          <section className={styles.reviewQueue} aria-labelledby="employer-queue-title">
            <h2 id="employer-queue-title" className={styles.sectionTitle}>
              Employers waiting for verification ({pendingEmployers.length})
            </h2>
            <AdminEmployerQueue
              employers={pendingEmployers.map((employer) => ({
                id: employer.id,
                companyName: employer.companyName,
                industry: employer.industry,
                website: employer.website,
                email: employer.user?.email ?? "",
                pendingJobs: employer._count.jobs,
              }))}
            />
          </section>

          <section className={styles.reviewQueue} aria-labelledby="review-queue-title">
            <h2 id="review-queue-title" className={styles.sectionTitle}>
              Vacancies waiting for review ({pendingJobs.length})
            </h2>
            <AdminJobReviewQueue jobs={pendingJobs.map(serializeJob)} />
          </section>

          <section className={styles.reviewQueue} aria-labelledby="live-jobs-title">
            <h2 id="live-jobs-title" className={styles.sectionTitle}>
              Live vacancies ({liveJobs.length})
            </h2>
            <AdminJobReviewQueue jobs={liveJobs.map(serializeJob)} live />
          </section>

          <section className={styles.grid} aria-label="Administration safeguards">
            <SurfaceCard as="article" className={styles.portalCard}>
              <span className={styles.cardLabel}>Employer trust</span>
              <h2>Verification decisions</h2>
              <p>
                Employer identity is reviewed before publication access is
                granted. Verification changes remain server-authorised and
                auditable.
              </p>
            </SurfaceCard>

            <SurfaceCard as="article" className={styles.portalCard}>
              <span className={styles.cardLabel}>Vacancy trust</span>
              <h2>Moderation decisions</h2>
              <p>
                Publish, reject or archive reviewable vacancies. Rejections
                require a reason and every decision records the authenticated
                administrator.
              </p>
            </SurfaceCard>

            <SurfaceCard as="article" className={styles.portalCard}>
              <span className={styles.cardLabel}>Security boundary</span>
              <h2>Protected writes</h2>
              <ul>
                <li>Database-backed ADMIN role checks remain mandatory.</li>
                <li>Same-origin mutation protection remains active.</li>
                <li>Privileged changes retain durable audit evidence.</li>
              </ul>
            </SurfaceCard>

            <SurfaceCard as="article" className={styles.portalCard}>
              <span className={styles.cardLabel}>Human control</span>
              <h2>Consequential decisions</h2>
              <p>
                Employer verification and vacancy moderation remain explicit
                human administrative actions. Automated assistance cannot grant
                privileged access by itself.
              </p>
            </SurfaceCard>
          </section>
        </WorkspaceShell>
      </main>
    </div>
  );
}
