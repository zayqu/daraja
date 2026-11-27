import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PageHeader } from "@/components/dashboard/DashboardUi";
import SurfaceCard from "@/components/ui/SurfaceCard";
import AccountDeletionForm from "./AccountDeletionForm";
import styles from "./privacy.module.css";

export const metadata = { title: "Privacy & Data", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function PrivacyPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=/account/privacy");
  }

  return (
    <>
      <PageHeader
        title="Privacy & data"
        description="Download the information tied to your account, or delete your account permanently."
      />

      <section className={styles.stack} aria-label="Privacy controls">
        <SurfaceCard as="article" className={styles.privacyCard}>
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
        </SurfaceCard>

        <SurfaceCard as="article" className={styles.privacyCard}>
          <span className={styles.cardLabel}>Private by default</span>
          <h2>Candidate documents</h2>
          <p>
            Candidate documents are private by default. Storage identifiers,
            authentication secrets and session tokens are never included in
            the account export.
          </p>
        </SurfaceCard>

        <SurfaceCard as="article" className={styles.privacyCard} tone="danger">
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
        </SurfaceCard>
      </section>
    </>
  );
}
