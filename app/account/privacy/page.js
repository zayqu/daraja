import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import PublicSiteNav from "@/components/PublicSiteNav";
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
            your signed-in account. Private files and security credentials are
            not exposed inside the JSON export.
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
            <Link href="/account/career">Open career workspace</Link>
          </article>

          <article className={styles.card}>
            <h2>Delete my account</h2>
            <p>
              Permanent self-service deletion is being implemented as a separate
              protected workflow. Daraja will not label simple deactivation as
              deletion. The final flow must remove eligible personal data and
              private files while retaining only records that have a documented
              legal, payment, fraud or audit requirement.
            </p>
            <span className={styles.status}>Deletion is not enabled yet</span>
          </article>
        </section>
      </main>
    </>
  );
}
