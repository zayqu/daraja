import { notFound, redirect } from "next/navigation";
import {
  employerPortalEnabled,
  getActor,
  isAdmin,
} from "@/lib/employer-access";
import EmployerPortalTabs from "@/components/EmployerPortalTabs";
import SiteNav from "@/components/SiteNav";
import PageHero from "@/components/ui/PageHero";
import WorkspaceShell from "@/components/ui/WorkspaceShell";
import SurfaceCard from "@/components/ui/SurfaceCard";
import styles from "../portal.module.css";

export const metadata = { title: "Moderation | Daraja" };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!employerPortalEnabled()) notFound();

  const actor = await getActor();
  if (!actor) redirect("/auth/signin?callbackUrl=/admin");
  if (!isAdmin(actor)) notFound();

  return (
    <div className={styles.page}>
      <SiteNav />

      <main id="main-content">
        <PageHero
          eyebrow="Protected administration"
          title="Verification and vacancy moderation."
          description="Review employer trust, make publication decisions and preserve an auditable moderation trail."
        />

        <WorkspaceShell>
          <EmployerPortalTabs showAdmin />

          <section className={styles.summaryStrip}>
            <div>
              <span>Administrator</span>
              <strong>{actor.email}</strong>
            </div>
            <div>
              <span>Access level</span>
              <strong className={styles.statusVerified}>admin</strong>
            </div>
          </section>

          <section className={styles.grid} aria-label="Administration safeguards">
            <SurfaceCard as="article">
              <span className={styles.cardLabel}>Employer trust</span>
              <h2>Verification decisions</h2>
              <p>
                Employer identity is reviewed before publication access is
                granted. Verification changes remain server-authorised and
                auditable.
              </p>
            </SurfaceCard>

            <SurfaceCard as="article">
              <span className={styles.cardLabel}>Vacancy trust</span>
              <h2>Moderation decisions</h2>
              <p>
                Publish, reject or archive reviewable vacancies. Rejections
                require a reason and every decision records the authenticated
                administrator.
              </p>
            </SurfaceCard>

            <SurfaceCard as="article">
              <span className={styles.cardLabel}>Security boundary</span>
              <h2>Protected writes</h2>
              <ul>
                <li>Database-backed ADMIN role checks remain mandatory.</li>
                <li>Same-origin mutation protection remains active.</li>
                <li>Privileged changes retain durable audit evidence.</li>
              </ul>
            </SurfaceCard>

            <SurfaceCard as="article">
              <span className={styles.cardLabel}>Human control</span>
              <h2>Consequential decisions</h2>
              <p>
                Employer verification and vacancy moderation remain explicit
                human administrative actions. Automated assistance cannot grant
                privileged access by itself.
              </p>
            </SurfaceCard>
          </section>
        </WorkspaceShell>
      </main>
    </div>
  );
}
