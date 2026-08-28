import { redirect } from "next/navigation";
import { auth } from "@/auth";
import PublicSiteNav from "@/components/PublicSiteNav";
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
    <>
      <PublicSiteNav />
      <main className={styles.shell} id="main-content">
        <header className={styles.header}>
          <p>Privacy & data</p>
          <h1>Your Daraja data should stay under your control</h1>
          <span>
            Download the account information Daraja currently associates with
            your signed-in account, or permanently delete your account when you
            no longer want to use Daraja.
          </span>
        </header>

        <section className={styles.stack} aria-label="Privacy controls">
          <article className={styles.card}>
            <h2>Download my account data</h2>
            <p>
              Export your profile, preferences, saved jobs, application history,
              account-linked subscriptions and payment records as JSON.
            </p>
            <a className={styles.primaryAction} href="/api/account/export">
              Download account data
            </a>
          </article>

          <article className={styles.card}>
            <h2>Private documents</h2>
            <p>
              Candidate documents are private by default. Storage identifiers,
              authentication secrets and session tokens are never placed in the
              account export.
            </p>
          </article>

          <article className={`${styles.card} ${styles.dangerCard}`}>
            <h2>Delete my account permanently</h2>
            <p>
              Deletion removes your Daraja sign-in, sessions, profiles, alerts,
              saved jobs, Daraja-managed applications and eligible private
              documents. Public employer vacancy records may remain as business
              records but are detached from the deleted account. Minimal payment,
              subscription and audit evidence is retained without your active
              account identity.
            </p>
            <p>
              Download your account data first if you want to keep a copy. This
              action cannot be undone.
            </p>
            <AccountDeletionForm />
          </article>
        </section>
      </main>
    </>
  );
}
