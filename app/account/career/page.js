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

export const metadata = { title: "Career workspace | Daraja" };
export const dynamic = "force-dynamic";

export default async function CareerPage() {
  if (!candidateCareerEnabled()) notFound();

  const user = await getCandidateUser();
  if (!user) redirect("/auth/signin?callbackUrl=/account/career");

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
              <Link href="/jobs">Browse vacancies →</Link>
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
