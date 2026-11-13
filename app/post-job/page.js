import { notFound, redirect } from "next/navigation";
import EmployerVacancyForm from "@/components/EmployerVacancyForm";
import EmployerPortalTabs from "@/components/EmployerPortalTabs";
import {
  employerPortalEnabled,
  getActor,
  isAdmin,
  isSuspendedEmployer,
} from "@/lib/employer-access";
import { postJobHref } from "@/lib/platform-roles";
import SiteNav from "@/components/SiteNav";
import PageHero from "@/components/ui/PageHero";
import WorkspaceShell from "@/components/ui/WorkspaceShell";
import SurfaceCard from "@/components/ui/SurfaceCard";
import styles from "../portal.module.css";
import { getCategoryNames } from "@/lib/public-jobs";

export const metadata = {
  title: "Create a vacancy",
  description: "Create a vacancy from your Daraja employer account.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function PostJobPage() {
  if (!employerPortalEnabled()) notFound();

  const actor = await getActor();
  if (!actor) redirect("/auth/signin?callbackUrl=/post-job");
  // Administrators post from the admin panel; they never need an employer profile.
  if (!actor.employer && isAdmin(actor)) redirect(postJobHref(actor.role));
  if (!actor.employer) redirect("/employer");
  // The employer workspace explains the suspension; no new vacancies meanwhile.
  if (isSuspendedEmployer(actor)) redirect("/employer");

  return (
    <div className={styles.page}>
      <SiteNav />

      <main id="main-content">
        <PageHero
          eyebrow="Employer workspace"
          title="Create a vacancy"
          description="Fill in the job details below. You can follow the vacancy's status in your employer workspace."
        />

        <WorkspaceShell className={styles.formScope}>
          <EmployerPortalTabs showAdmin={isAdmin(actor)} showCreateVacancy />

          <SurfaceCard className={styles.formCard} aria-labelledby="vacancy-form-title">
            <div className={styles.formIntro}>
              <span className={styles.cardLabel}>Position information</span>
              <h2 id="vacancy-form-title">Vacancy details</h2>
              <p>
                Give the real job title, where the job is, its category and a
                full description of the role. Your company name is added from
                your employer profile.
              </p>
            </div>

            <EmployerVacancyForm companyName={actor.employer.companyName} categories={await getCategoryNames()} />
          </SurfaceCard>
        </WorkspaceShell>
      </main>
    </div>
  );
}
