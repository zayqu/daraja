import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import {
  employerPortalEnabled,
  getActor,
  isAdmin,
} from "@/lib/employer-access";
import EmployerProfileForm from "@/components/EmployerProfileForm";
import EmployerPortalTabs from "@/components/EmployerPortalTabs";
import SiteNav from "@/components/SiteNav";
import PageHero from "@/components/ui/PageHero";
import WorkspaceShell from "@/components/ui/WorkspaceShell";
import SurfaceCard from "@/components/ui/SurfaceCard";
import prisma from "@/lib/prisma";
import styles from "../portal.module.css";

export const metadata = { title: "Employer workspace | Daraja" };
export const dynamic = "force-dynamic";

function statusLabel(value) {
  return value.replaceAll("_", " ").toLowerCase();
}

export default async function EmployerPage() {
  if (!employerPortalEnabled()) notFound();

  const actor = await getActor();
  if (!actor) redirect("/auth/signin?callbackUrl=/employer");

  const status = actor.employer?.verificationStatus || "NOT_STARTED";
  const vacancies = actor.employer
    ? await prisma.job.findMany({
      where: { employerId: actor.employer.id },
      orderBy: { updatedAt: "desc" },
      take: 50,
      select: {
        id: true,
        slug: true,
        title: true,
        deadline: true,
        moderationStatus: true,
        moderationNote: true,
        active: true,
      },
    })
    : [];
  const verified = status === "VERIFIED";

  return (
    <div className={styles.page}>
      <SiteNav />

      <main id="main-content">
        <PageHero
          eyebrow="Employer workspace"
          title={actor.employer?.companyName || "Create your employer profile"}
          description="Keep employer verification, vacancy submission and review status in one protected workspace."
        />

        <WorkspaceShell className={styles.formScope}>
          <EmployerPortalTabs showAdmin={isAdmin(actor)} />

          <section className={styles.summaryStrip}>
            <div>
              <span>Account</span>
              <strong>{actor.email}</strong>
            </div>
            <div>
              <span>Verification</span>
              <strong className={verified ? styles.statusVerified : styles.statusPending}>
                {statusLabel(status)}
              </strong>
            </div>
          </section>

          {actor.employer && (
            <section className={styles.reviewQueue} aria-labelledby="my-vacancies-title">
              <h2 id="my-vacancies-title" className={styles.sectionTitle}>
                Your vacancies ({vacancies.length})
              </h2>
              {!verified && (
                <p>
                  Daraja checks your company before your first vacancy goes
                  live. You can submit vacancies now; they are published once
                  your company is verified.
                </p>
              )}
              {vacancies.length ? (
                <ul>
                  {vacancies.map((job) => (
                    <li key={job.id}>
                      {job.active && job.moderationStatus === "PUBLISHED" ? (
                        <Link href={`/jobs/${job.slug || job.id}`}>{job.title}</Link>
                      ) : (
                        <strong>{job.title}</strong>
                      )}
                      {" "}— {statusLabel(job.moderationStatus)}
                      {job.deadline && `, closes ${job.deadline.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Dar_es_Salaam" })}`}
                      {job.moderationNote && job.moderationStatus === "REJECTED" && (
                        <span className={styles.statusPending}> Reason: {job.moderationNote}</span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No vacancies yet. <Link href="/post-job">Create your first vacancy →</Link></p>
              )}
            </section>
          )}

          <section className={styles.grid} aria-label="Employer workspace">
            <SurfaceCard as="article" className={styles.portalCard}>
              <span className={styles.cardLabel}>Trust & verification</span>
              <h2>Employer verification</h2>
              <p>
                Only verified employers can publish. Every verification and
                moderation decision is tied to an authenticated actor and audit
                history.
              </p>
              {!actor.employer && <EmployerProfileForm />}
            </SurfaceCard>

            <SurfaceCard as="article" className={styles.portalCard}>
              <span className={styles.cardLabel}>Vacancies</span>
              <h2>Publish a position</h2>
              {actor.employer ? (
                <>
                  <p>
                    Create a focused vacancy, submit it for moderation and keep
                    its publication state tied to your employer account.
                  </p>
                  <Link className={styles.action} href="/post-job">
                    Create vacancy →
                  </Link>
                </>
              ) : (
                <p>
                  Submit the employer profile first. Vacancy tools become
                  available after the profile exists.
                </p>
              )}
            </SurfaceCard>

            <SurfaceCard as="article" className={styles.portalCard}>
              <span className={styles.cardLabel}>Current access</span>
              <h2>What this workspace controls</h2>
              <ul>
                <li>Employer identity and verification status.</li>
                <li>Vacancies owned by this authenticated employer.</li>
                <li>Moderation state and review feedback.</li>
              </ul>
            </SurfaceCard>

            <SurfaceCard as="article" className={styles.portalCard}>
              <span className={styles.cardLabel}>Candidate privacy</span>
              <h2>Protected candidate access</h2>
              <p>
                An employer account does not grant unrestricted access to
                candidate CVs or private career data. Access must come through
                an authorised application or consented workflow.
              </p>
            </SurfaceCard>
          </section>
        </WorkspaceShell>
      </main>
    </div>
  );
}
