import Link from "next/link";
import PublicSiteNav from "@/components/PublicSiteNav";
import PageHero from "@/components/ui/PageHero";
import styles from "../auth.module.css";

export const metadata = { title: "Check your email" };

export default function VerifyRequestPage() {
  return (
    <div className={styles.page}>
      <PublicSiteNav />

      <main id="main-content">
        <PageHero
          eyebrow="Secure sign-in"
          title="Check your email to continue."
          description="Daraja sent a one-time sign-in link to the email address you provided."
          maxWidth="narrow"
          variant="overlap"
        />

        <div className={styles.cardWrap}>
          <section className={`${styles.card} ${styles.infoCard}`}>
            <p className={styles.eyebrow}>One-time link sent</p>
            <h2>Open the email in this browser</h2>
            <p>
              Use the secure link to return to your candidate account. The link
              expires automatically, and you can request another one from the
              sign-in page if needed.
            </p>
            <Link className={styles.returnLink} href="/jobs">
              Return to jobs
            </Link>
          </section>
        </div>
      </main>
    </div>
  );
}
