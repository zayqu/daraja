import { notFound, redirect } from "next/navigation";
import EmployerVacancyForm from "@/components/EmployerVacancyForm";
import EmployerPortalTabs from "@/components/EmployerPortalTabs";
import {
  employerPortalEnabled,
  getActor,
  isAdmin,
} from "@/lib/employer-access";
import SiteNav from "@/components/SiteNav";
import styles from "../portal.module.css";

export const metadata = {
  title: "Submit a verified vacancy",
  description: "Submit a vacancy from an authenticated Daraja employer account.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function PostJobPage() {
  if (!employerPortalEnabled()) notFound();

  const actor = await getActor();
  if (!actor) redirect("/auth/signin?callbackUrl=/post-job");
  if (!actor.employer) redirect("/employer");

  return (
    <div className={styles.page}>
      <SiteNav />

      <main id="main-content">
        <section className={styles.hero}>
          <div className={styles.heroInner}>
            <p className={styles.eyebrow}>Authenticated employer submission</p>
            <h1>Create a vacancy for review.</h1>
            <p>
              Daraja applies your verified employer identity automatically and
              keeps publication behind the moderation workflow.
            </p>
          </div>
        </section>

        <div className={styles.shell}>
          <EmployerPortalTabs showAdmin={isAdmin(actor)} />

          <section className={styles.formCard} aria-labelledby="vacancy-form-title">
            <div className={styles.formIntro}>
              <span className={styles.cardLabel}>Position information</span>
              <h2 id="vacancy-form-title">Vacancy details</h2>
              <p>
                Use the real role title, location, controlled professional
                category and complete position description. Your employer name
                is taken from the authenticated account.
              </p>
            </div>

            <EmployerVacancyForm companyName={actor.employer.companyName} />
          </section>
        </div>
      </main>
    </div>
  );
}
