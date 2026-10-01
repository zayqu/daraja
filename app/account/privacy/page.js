import { redirect } from "next/navigation";
import { auth } from "@/auth";
import CandidateAccountTabs from "@/components/CandidateAccountTabs";
import PublicSiteNav from "@/components/PublicSiteNav";
import { candidateCareerEnabled } from "@/lib/candidate-access";
import AccountDeletionForm from "./AccountDeletionForm";
import styles from "./privacy.module.css";

export const metadata = { title: "Privacy & Data | Daraja" };
export const dynamic = "force-dynamic";

export default async function PrivacyPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=/account/privacy");
  }

  return (
    <div className={styles.page}>
      <PublicSiteNav />

      <main id="main-content">
        <section className={styles.hero}>
          <div className={styles.heroInner}>
            <p className={styles.eyebrow}>Privacy & data</p>
            <h1>Your Daraja data stays under your control.</h1>
            <p>
              Download the information tied to your account or permanently
              delete your account when you no longer want to use Daraja.
            </p>
          </div>
        </section>

        <div className={styles.shell}>
          <CandidateAccountTabs showCareer={candidateCareerEnabled()} />

          <section className={styles.stack} aria-label="Privacy controls">
            <article className={styles.card}>
              <span className={styles.cardLabel}>Export</span>
              <h2>Download my account data</h2>
              <p>
                Export your profile, preferences, saved jobs, application
                history, account-linked subscriptions and payment records as
                JSON.
              </p>
              <a className={styles.primaryAction} href="/api/account/export">
                Download account data
              </a>
            </article>

            <article className={styles.card}>
              <span className={styles.cardLabel}>Private by default</span>
              <h2>Candidate documents</h2>
              <p>
                Candidate documents are private by default. Storage identifiers,
                authentication secrets and session tokens are never included in
                the account export.
              </p>
            </article>

            <article className={`${styles.card} ${styles.dangerCard}`}>
              <span className={styles.dangerLabel}>Permanent action</span>
              <h2>Delete my account permanently</h2>
              <p>
                Deletion removes your Daraja sign-in, sessions, profiles, alerts,
                saved jobs, Daraja-managed applications and eligible private
                documents. Public employer vacancy records may remain as business
                records but are detached from the deleted account.
              </p>
              <p>
                Download your account data first if you want to keep a copy.
                This action cannot be undone.
              </p>
              <AccountDeletionForm />
            </article>
          </section>
        </div>
      </main>
    </div>
  );
}
