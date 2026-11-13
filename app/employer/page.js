import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import {
  employerPortalEnabled,
  getActor,
  isAdmin,
} from "@/lib/employer-access";
import { postJobHref } from "@/lib/platform-roles";
import EmployerProfileForm from "@/components/EmployerProfileForm";
import EmployerPortalTabs from "@/components/EmployerPortalTabs";
import SiteNav from "@/components/SiteNav";
import PageHero from "@/components/ui/PageHero";
import WorkspaceShell from "@/components/ui/WorkspaceShell";
import SurfaceCard from "@/components/ui/SurfaceCard";
import prisma from "@/lib/prisma";
import styles from "../portal.module.css";

export const metadata = {
  title: "Employer workspace",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

// Employer-facing wording for each verification state.
const VERIFICATION = {
  NOT_STARTED: { label: "Not started", tone: "pending" },
  PENDING: { label: "Being checked", tone: "pending" },
  VERIFIED: { label: "Verified", tone: "success" },
  REJECTED: { label: "Changes needed", tone: "danger" },
  SUSPENDED: { label: "Suspended", tone: "danger" },
};

const TEXT_TONE = {
  pending: styles.statusPending,
  success: styles.statusVerified,
  danger: styles.statusDanger,
};

const BADGE_TONE = {
  pending: styles.badgePending,
  success: styles.badgeSuccess,
  danger: styles.badgeDanger,
  neutral: styles.badgeNeutral,
};

function vacancyStatus(job) {
  if (job.moderationStatus === "PUBLISHED") {
    return job.active ? { label: "Live", tone: "success" } : { label: "Closed", tone: "neutral" };
  }
  if (job.moderationStatus === "PENDING_REVIEW") return { label: "In review", tone: "pending" };
  if (job.moderationStatus === "REJECTED") return { label: "Not approved", tone: "danger" };
  if (job.moderationStatus === "ARCHIVED") return { label: "Closed", tone: "neutral" };
  return { label: "Draft", tone: "neutral" };
}

function formatDate(date) {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Dar_es_Salaam",
  });
}

function heroFor(actor, adminView) {
  if (adminView) {
    return {
      title: "You're signed in as an admin",
      description:
        "Admin accounts don't need an employer profile. Post jobs and check employers from the admin panel.",
    };
  }
  if (!actor.employer) {
    return {
      title: "Create your employer profile",
      description:
        "Tell us about your company. Once Daraja has checked it, your vacancies can go live.",
    };
  }
  return {
    title: actor.employer.companyName,
    description: "Post vacancies and follow their review status in one place.",
  };
}

function AdminShortcuts() {
  return (
    <section className={styles.grid} aria-label="Admin shortcuts">
      <SurfaceCard as="article" className={styles.portalCard}>
        <span className={styles.cardLabel}>Vacancies</span>
        <h2>Post a job</h2>
        <p>
          Publish a vacancy on Daraja directly from the admin panel. It is
          marked as posted by Daraja.
        </p>
        <Link className={styles.action} href={postJobHref("ADMIN")}>
          Post a job →
        </Link>
      </SurfaceCard>

      <SurfaceCard as="article" className={styles.portalCard}>
        <span className={styles.cardLabel}>Trust & verification</span>
        <h2>Check employers and their vacancies</h2>
        <p>
          Verify or reject the company details employers send, and approve
          their vacancies before they go live.
        </p>
        <div className={styles.actionRow}>
          <Link className={styles.action} href="/admin/employers">
            Review employers →
          </Link>
          <Link className={styles.secondaryAction} href="/admin">
            Review queue →
          </Link>
        </div>
      </SurfaceCard>
    </section>
  );
}

function VerificationCard({ employer }) {
  const status = employer?.verificationStatus || "NOT_STARTED";

  return (
    <SurfaceCard as="article" className={styles.portalCard}>
      <span className={styles.cardLabel}>Trust & verification</span>
      {status === "NOT_STARTED" && (
        <>
          <h2>Your company details</h2>
          <p>
            Daraja checks every company before its vacancies go live. This
            keeps fake jobs off Daraja.
          </p>
          <EmployerProfileForm />
        </>
      )}
      {status === "PENDING" && (
        <>
          <h2>We&apos;re checking your company</h2>
          <p>
            Thank you for sending your company details. You can already create
            vacancies; they go live once your company is verified.
          </p>
        </>
      )}
      {status === "VERIFIED" && (
        <>
          <h2>Your company is verified</h2>
          <p>
            {employer.autoPublish
              ? "Trusted employer: your vacancies go live as soon as you submit them."
              : "Daraja reviews each new vacancy before it goes live."}
          </p>
        </>
      )}
      {status === "REJECTED" && (
        <>
          <h2>Your company details need changes</h2>
          {employer.verificationNote && (
            <p className={styles.note}>Daraja&apos;s note: {employer.verificationNote}</p>
          )}
          <p>Update your details below and send them again.</p>
          <EmployerProfileForm initial={employer} submitLabel="Send updated details" />
        </>
      )}
      {status === "SUSPENDED" && (
        <>
          <h2>This employer account is suspended</h2>
          {employer.verificationNote && (
            <p className={styles.note}>Daraja&apos;s note: {employer.verificationNote}</p>
          )}
          <p>
            You can&apos;t create vacancies while the account is suspended.
            Contact Daraja if you think this is a mistake.
          </p>
          <Link className={styles.secondaryAction} href="/contact">
            Contact Daraja →
          </Link>
        </>
      )}
    </SurfaceCard>
  );
}

function VacanciesCard({ employer, canCreateVacancy }) {
  return (
    <SurfaceCard as="article" className={styles.portalCard}>
      <span className={styles.cardLabel}>Vacancies</span>
      {!employer ? (
        <>
          <h2>How posting works</h2>
          <ol className={styles.steps}>
            <li>Send your company details.</li>
            <li>Daraja checks your company.</li>
            <li>Create vacancies and follow each one from review to live.</li>
          </ol>
        </>
      ) : canCreateVacancy ? (
        <>
          <h2>Publish a position</h2>
          <p>
            Add the job title, location, closing date and how to apply. You
            can follow each vacancy&apos;s status here.
          </p>
          <Link className={styles.action} href="/post-job">
            Create vacancy →
          </Link>
        </>
      ) : (
        <>
          <h2>Publish a position</h2>
          <p>Vacancies are paused while this employer account is suspended.</p>
        </>
      )}
    </SurfaceCard>
  );
}

function VacancyList({ vacancies, verified, canCreateVacancy }) {
  return (
    <SurfaceCard as="section" className={styles.vacancyPanel} aria-labelledby="my-vacancies-title">
      <div className={styles.panelHeader}>
        <h2 id="my-vacancies-title" className={styles.sectionTitle}>
          Your vacancies ({vacancies.length})
        </h2>
        {canCreateVacancy && vacancies.length > 0 && (
          <Link className={styles.textAction} href="/post-job">
            Create vacancy →
          </Link>
        )}
      </div>
      {!verified && canCreateVacancy && (
        <p className={styles.panelNote}>
          Daraja checks your company before your first vacancy goes live. You
          can submit vacancies now; they are published once your company is
          verified.
        </p>
      )}
      {vacancies.length ? (
        <ul className={styles.vacancyList}>
          {vacancies.map((job) => {
            const state = vacancyStatus(job);
            return (
              <li key={job.id}>
                <div className={styles.vacancyMain}>
                  {job.active && job.moderationStatus === "PUBLISHED" ? (
                    <Link href={`/jobs/${job.slug || job.id}`}>{job.title}</Link>
                  ) : (
                    <strong>{job.title}</strong>
                  )}
                  {job.deadline && <span>Closes {formatDate(job.deadline)}</span>}
                </div>
                <span className={`${styles.badge} ${BADGE_TONE[state.tone]}`}>
                  {state.label}
                </span>
                {job.moderationNote && job.moderationStatus === "REJECTED" && (
                  <p className={styles.note}>Daraja&apos;s note: {job.moderationNote}</p>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className={styles.panelNote}>
          No vacancies yet.{" "}
          {canCreateVacancy && <Link href="/post-job">Create your first vacancy →</Link>}
        </p>
      )}
    </SurfaceCard>
  );
}

export default async function EmployerPage() {
  if (!employerPortalEnabled()) notFound();

  const actor = await getActor();
  if (!actor) redirect("/auth/signin?callbackUrl=/employer");

  // Administrators post jobs and verify employers from /admin; the employer
  // profile API refuses admin accounts, so they never see the profile form.
  const adminView = isAdmin(actor) && !actor.employer;
  const status = actor.employer?.verificationStatus || "NOT_STARTED";
  const verification = VERIFICATION[status] || VERIFICATION.PENDING;
  const canCreateVacancy =
    isAdmin(actor) || (Boolean(actor.employer) && status !== "SUSPENDED");
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
  const hero = heroFor(actor, adminView);

  return (
    <div className={styles.page}>
      <SiteNav />

      <main id="main-content">
        <PageHero eyebrow="Employer workspace" title={hero.title} description={hero.description} />

        <WorkspaceShell className={styles.formScope}>
          <EmployerPortalTabs showAdmin={isAdmin(actor)} showCreateVacancy={canCreateVacancy} />

          <section className={styles.summaryStrip}>
            <div>
              <span>Account</span>
              <strong>{actor.email}</strong>
            </div>
            {adminView ? (
              <div>
                <span>Access</span>
                <strong className={styles.statusVerified}>Daraja admin</strong>
              </div>
            ) : (
              <div>
                <span>Verification</span>
                <strong className={TEXT_TONE[verification.tone]}>{verification.label}</strong>
              </div>
            )}
          </section>

          {adminView ? (
            <AdminShortcuts />
          ) : (
            <>
              {actor.employer && (
                <VacancyList
                  vacancies={vacancies}
                  verified={status === "VERIFIED"}
                  canCreateVacancy={canCreateVacancy}
                />
              )}

              <section className={styles.grid} aria-label="Employer workspace">
                <VerificationCard employer={actor.employer} />
                <VacanciesCard employer={actor.employer} canCreateVacancy={canCreateVacancy} />

                <SurfaceCard as="article" className={styles.portalCard}>
                  <span className={styles.cardLabel}>Your workspace</span>
                  <h2>What you can do here</h2>
                  <ul>
                    <li>Check your company&apos;s verification status.</li>
                    <li>Create vacancies and follow each one from review to live.</li>
                    <li>Read Daraja&apos;s note when a vacancy is not approved.</li>
                  </ul>
                </SurfaceCard>

                <SurfaceCard as="article" className={styles.portalCard}>
                  <span className={styles.cardLabel}>Candidate privacy</span>
                  <h2>Candidates stay in control</h2>
                  <p>
                    Employer accounts do not get open access to candidate CVs or
                    private details. You see them only through a candidate&apos;s
                    application or with their consent.
                  </p>
                </SurfaceCard>
              </section>
            </>
          )}
        </WorkspaceShell>
      </main>
    </div>
  );
}
