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
import { loadSiteSettings, siteSetting } from "@/lib/features";
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

  await loadSiteSettings();
  const priceValue = siteSetting("promo.price");
  const daysValue = siteSetting("promo.days");

  return (
    <EmployerVacancyForm
      companyName={actor.employer.companyName}
      categories={await getCategoryNames()}
      publishesNow={publishesWithoutReview(actor.employer)}
      notices={<EmployerVerificationNotice employer={actor.employer} />}
      featurePrice={(Number.isSafeInteger(priceValue) && priceValue > 0 ? priceValue : 30000).toLocaleString("en-GB")}
      featureDays={Number.isSafeInteger(daysValue) && daysValue > 0 ? daysValue : 14}
    />
  );
}
