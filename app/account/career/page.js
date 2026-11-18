import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  candidateCareerEnabled,
  getCandidateUser,
} from "@/lib/candidate-access";
import PublicSiteNav from "@/components/PublicSiteNav";
import CandidateAccountTabs from "@/components/CandidateAccountTabs";
import PageHero from "@/components/ui/PageHero";
import WorkspaceShell from "@/components/ui/WorkspaceShell";
import styles from "./career.module.css";
import prisma from "@/lib/prisma";

export const metadata = { title: "Career workspace" };
export const dynamic = "force-dynamic";

const APPLICATION_LABELS = {
  PENDING: "Submitted",
  REVIEWED: "Under review",
  SHORTLISTED: "Shortlisted",
  OFFERED: "Offer received",
  REJECTED: "Not selected",
  WITHDRAWN: "Withdrawn",
};

function vacancyUrl(job) {
  return `/jobs/${encodeURIComponent(job.slug)}`;
}

export default async function CareerPage() {
  if (!candidateCareerEnabled()) notFound();

  const user = await getCandidateUser();
  if (!user) redirect("/auth/signin?callbackUrl=/account/career");

  // Only load private records belonging to this signed-in candidate.
  const [savedJobs, applications] = await Promise.all([
    prisma.savedJob.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: {
        id: true,
        job: { select: { slug: true, title: true, company: true, active: true } },
      },
    }),
    user.jobSeeker
      ? prisma.application.findMany({
          where: { jobSeekerId: user.jobSeeker.id },
          orderBy: { createdAt: "desc" },
          take: 12,
          select: {
            id: true,
            status: true,
            job: { select: { slug: true, title: true, company: true } },
          },
        })
      : Promise.resolve([]),
  ]);

  return (
    <>
      <PublicSiteNav />
      <main className={styles.page} id="main-content">
        <PageHero
          eyebrow="Candidate workspace"
          title="Keep your career tools in one place."
          description="Use Daraja to organise your search, manage alerts and keep control of your account data as the career workspace grows."
        />

        <WorkspaceShell>
          <CandidateAccountTabs showCareer />

          <section className={styles.summaryCard}>
            <div>
              <span>Signed-in candidate</span>
              <strong>{user.name || user.email}</strong>
            </div>
            <div>
              <span>Account email</span>
              <strong>{user.email}</strong>
            </div>
          </section>

          <section id="my-jobs" className={styles.myJobs} aria-labelledby="my-jobs-title">
            <div className={styles.myJobsHeading}>
              <div>
                <span className={styles.cardLabel}>My jobs</span>
                <h2 id="my-jobs-title">Keep track of your opportunities</h2>
              </div>
              <Link href="/jobs" className={styles.browseLink}>Find more jobs</Link>
            </div>
            <div className={styles.myJobsGrid}>
              <section className={styles.jobPanel} aria-labelledby="saved-jobs-title">
                <div className={styles.jobPanelHeading}>
                  <h3 id="saved-jobs-title">Saved jobs</h3>
                  <span>{savedJobs.length}{savedJobs.length === 12 ? "+" : ""}</span>
                </div>
                {savedJobs.length ? (
                  <ul className={styles.jobList}>
                    {savedJobs.map(({ id, job }) => (
                      <li key={id}>
                        <Link href={vacancyUrl(job)}>
                          <strong>{job.title}</strong>
                          <span>{job.company}</span>
                        </Link>
                        <span className={styles.jobStatus}>{job.active ? "View vacancy" : "No longer open"}</span>
                      </li>
                    ))}
                  </ul>
                ) : <p className={styles.emptyState}>No saved jobs yet. Browse vacancies to find opportunities.</p>}
              </section>
              <section className={styles.jobPanel} aria-labelledby="applications-title">
                <div className={styles.jobPanelHeading}>
                  <h3 id="applications-title">Applications</h3>
                  <span>{applications.length}{applications.length === 12 ? "+" : ""}</span>
                </div>
                {applications.length ? (
                  <ul className={styles.jobList}>
                    {applications.map(({ id, job, status }) => (
                      <li key={id}>
                        <Link href={vacancyUrl(job)}>
                          <strong>{job.title}</strong>
                          <span>{job.company}</span>
                        </Link>
                        <span className={styles.jobStatus}>{APPLICATION_LABELS[status] || "Status unavailable"}</span>
                      </li>
                    ))}
                  </ul>
                ) : <p className={styles.emptyState}>Applications submitted through Daraja will appear here.</p>}
                <p className={styles.privacyNote}>Applications sent through external employer websites are not tracked automatically.</p>
              </section>
            </div>
          </section>

          <section className={styles.grid} aria-label="Career tools">
            <article className={styles.card}>
              <span className={styles.cardLabel}>Profile</span>
              <h2>Candidate profile</h2>
              <p>
                Your Daraja candidate record is private by default and is used
                only in authorised career and application workflows.
              </p>
            </article>

            <article className={styles.card}>
              <span className={styles.cardLabel}>Discovery</span>
              <h2>Saved jobs</h2>
              <p>
                Keep suitable vacancies together without changing their
                original application destination.
              </p>
              <Link href="/account/career#my-jobs">View saved jobs →</Link>
            </article>

            <article className={styles.card}>
              <span className={styles.cardLabel}>Applications</span>
              <h2>Application history</h2>
              <p>
                Daraja-managed applications stay tied to your signed-in account
                and can be tracked through their current status.
              </p>
            </article>

            <article className={styles.card}>
              <span className={styles.cardLabel}>Alerts</span>
              <h2>Job alerts</h2>
              <p>
                Choose categories and optional refinements for personalised
                email alerts, then pause or update them whenever you need.
              </p>
              <Link href="/account/alerts">Manage job alerts →</Link>
            </article>

            <article className={styles.card}>
              <span className={styles.cardLabel}>Privacy</span>
              <h2>Privacy & data</h2>
              <p>
                Download your account data or permanently delete your Daraja
                account through the protected privacy controls.
              </p>
              <Link href="/account/privacy">Open privacy controls →</Link>
            </article>

            <article className={styles.card}>
              <span className={styles.cardLabel}>Career documents</span>
              <h2>Smart CV Builder</h2>
              <p>
                Build a private Master CV, create job-specific versions, check
                ATS readiness and export a clean PDF using Tanzania-first
                application modes.
              </p>
              <Link href="/account/career/cv">Build or update your CV →</Link>
            </article>
          </section>
        </WorkspaceShell>
      </main>
    </>
  );
}
