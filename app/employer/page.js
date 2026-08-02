import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { employerPortalEnabled, getActor } from "@/lib/employer-access";
import EmployerProfileForm from "@/components/EmployerProfileForm";
import styles from "../portal.module.css";

export const metadata = { title: "Employer workspace | Daraja" };

export default async function EmployerPage() {
  if (!employerPortalEnabled()) notFound();
  const actor = await getActor();
  if (!actor) redirect("/auth/signin?callbackUrl=/employer");
  const status = actor.employer?.verificationStatus || "NOT_STARTED";
  return (
    <main className={styles.shell} id="main-content">
      <header className={styles.header}>
        <p className={styles.eyebrow}>Employer workspace</p>
        <h1>{actor.employer?.companyName || "Create your employer profile"}</h1>
        <p>Manage verified vacancies and follow each review decision in one secure place.</p>
      </header>
      <section className={styles.grid} aria-label="Employer account status">
        <article className={styles.card}>
          <h2>Verification</h2>
          <p><strong>Status:</strong> {status.replaceAll("_", " ").toLowerCase()}</p>
          <p>Only verified employers can publish. Every change is recorded for candidate safety.</p>
          {!actor.employer && <EmployerProfileForm />}
        </article>
        <article className={styles.card}>
          <h2>Vacancies</h2>
          {actor.employer ? (
            <>
              <p>Create a focused position, submit it for review and monitor its publication status.</p>
              <Link className={styles.action} href="/post-job">Create vacancy</Link>
            </>
          ) : (
            <p>Submit the employer profile first. Vacancy tools become available after the profile is created.</p>
          )}
        </article>
      </section>
    </main>
  );
}
