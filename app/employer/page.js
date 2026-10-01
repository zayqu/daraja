import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import {
  employerPortalEnabled,
  getActor,
  isAdmin,
} from "@/lib/employer-access";
import EmployerProfileForm from "@/components/EmployerProfileForm";
import EmployerPortalTabs from "@/components/EmployerPortalTabs";
import SiteNav from "@/components/SiteNav";
import styles from "../portal.module.css";

export const metadata = { title: "Employer workspace | Daraja" };
export const dynamic = "force-dynamic";

function statusLabel(value) {
  return value.replaceAll("_", " ").toLowerCase();
}

export default async function EmployerPage() {
  if (!employerPortalEnabled()) notFound();

  const actor = await getActor();
  if (!actor) redirect("/auth/signin?callbackUrl=/employer");

  const status = actor.employer?.verificationStatus || "NOT_STARTED";
  const verified = status === "VERIFIED";

  return (
    <div className={styles.page}>
      <SiteNav />

      <main id="main-content">
        <section className={styles.hero}>
          <div className={styles.heroInner}>
            <p className={styles.eyebrow}>Employer workspace</p>
            <h1>
              {actor.employer?.companyName || "Create your employer profile"}
            </h1>
            <p>
              Keep employer verification, vacancy submission and review status in
              one protected workspace.
            </p>
          </div>
        </section>

        <div className={styles.shell}>
          <EmployerPortalTabs showAdmin={isAdmin(actor)} />

          <section className={styles.summaryStrip}>
            <div>
              <span>Account</span>
              <strong>{actor.email}</strong>
            </div>
            <div>
              <span>Verification</span>
              <strong className={verified ? styles.statusVerified : styles.statusPending}>
                {statusLabel(status)}
              </strong>
            </div>
          </section>

          <section className={styles.grid} aria-label="Employer workspace">
            <article className={styles.card}>
              <span className={styles.cardLabel}>Trust & verification</span>
              <h2>Employer verification</h2>
              <p>
                Only verified employers can publish. Every verification and
                moderation decision is tied to an authenticated actor and audit
                history.
              </p>
              {!actor.employer && <EmployerProfileForm />}
            </article>

            <article className={styles.card}>
              <span className={styles.cardLabel}>Vacancies</span>
              <h2>Publish a position</h2>
              {actor.employer ? (
                <>
                  <p>
                    Create a focused vacancy, submit it for moderation and keep
                    its publication state tied to your employer account.
                  </p>
                  <Link className={styles.action} href="/post-job">
                    Create vacancy →
                  </Link>
                </>
              ) : (
                <p>
                  Submit the employer profile first. Vacancy tools become
                  available after the profile exists.
                </p>
              )}
            </article>

            <article className={styles.card}>
              <span className={styles.cardLabel}>Current access</span>
              <h2>What this workspace controls</h2>
              <ul>
                <li>Employer identity and verification status.</li>
                <li>Vacancies owned by this authenticated employer.</li>
                <li>Moderation state and review feedback.</li>
              </ul>
            </article>

            <article className={styles.card}>
              <span className={styles.cardLabel}>Candidate privacy</span>
              <h2>Protected candidate access</h2>
              <p>
                An employer account does not grant unrestricted access to
                candidate CVs or private career data. Access must come through
                an authorised application or consented workflow.
              </p>
            </article>
          </section>
        </div>
      </main>
    </div>
  );
}
