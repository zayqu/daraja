import { notFound, redirect } from "next/navigation";
import EmployerVacancyForm from "@/components/EmployerVacancyForm";
import { employerPortalEnabled, getActor } from "@/lib/employer-access";
import SiteNav from "@/components/SiteNav";
import styles from "../portal.module.css";

export const metadata = {
  title: "Submit a verified vacancy",
  description: "Submit a vacancy from an authenticated Daraja employer account.",
  robots: { index: false, follow: false },
};

export default async function PostJobPage() {
  if (!employerPortalEnabled()) notFound();
  const actor = await getActor();
  if (!actor) redirect("/auth/signin?callbackUrl=/post-job");
  if (!actor.employer) redirect("/employer");

  return (
    <>
      <SiteNav />
      <main className={styles.shell} id="main-content">
        <header className={styles.header}>
          <p className={styles.eyebrow}>Authenticated employer submission</p>
          <h1>Create a vacancy</h1>
          <p>
            Daraja applies your employer identity and sends every vacancy through
            moderation before publication.
          </p>
        </header>
        <section className={styles.card} aria-labelledby="vacancy-form-title">
          <h2 id="vacancy-form-title">Position information</h2>
          <EmployerVacancyForm companyName={actor.employer.companyName} />
        </section>
      </main>
    </>
  );
}
