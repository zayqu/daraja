import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import EmployerVacancyForm from "@/components/EmployerVacancyForm";
import EmployerVerificationNotice from "@/components/EmployerVerificationNotice";
import {
  employerPortalEnabled,
  getActor,
  isAdmin,
  isSuspendedEmployer,
  publishesWithoutReview,
} from "@/lib/employer-access";
import { postJobHref } from "@/lib/platform-roles";
import { PageHeader } from "@/components/dashboard/DashboardUi";
import dash from "@/components/dashboard/dashboard.module.css";
import styles from "../portal.module.css";
import { getCategoryNames } from "@/lib/public-jobs";

export const metadata = {
  title: "Post a job",
  description: "Post a vacancy from your Daraja employer account.",
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
  // The employer dashboard explains the suspension; no new vacancies meanwhile.
  if (isSuspendedEmployer(actor)) redirect("/employer");

  return (
    <>
      <PageHeader
        title="Post a job"
        description="Fill in the job details below. You can follow the vacancy's status under My vacancies."
        actions={<Link className={dash.button} href="/employer/vacancies">My vacancies</Link>}
      />

      <EmployerVerificationNotice employer={actor.employer} />

      <section className={`${dash.card} ${styles.formScope}`} aria-labelledby="vacancy-form-title">
        <div className={styles.formIntro}>
          <h2 id="vacancy-form-title" className={dash.cardTitle}>Vacancy details</h2>
          <p>
            Give the real job title, where the job is, its category and a full
            description of the role. Your company name is added from your
            employer profile.
          </p>
        </div>

        <EmployerVacancyForm
          companyName={actor.employer.companyName}
          categories={await getCategoryNames()}
          publishesNow={publishesWithoutReview(actor.employer)}
        />
      </section>
    </>
  );
}
