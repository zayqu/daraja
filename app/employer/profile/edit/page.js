import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  employerPortalEnabled,
  getActor,
  isAdmin,
  isSuspendedEmployer,
} from "@/lib/employer-access";
import EmployerProfileForm from "@/components/EmployerProfileForm";
import EmployerVerificationNotice from "@/components/EmployerVerificationNotice";
import { PageHeader } from "@/components/dashboard/DashboardUi";
import dash from "@/components/dashboard/dashboard.module.css";
import portal from "../../../portal.module.css";

export const metadata = {
  title: "Edit company details",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function EditEmployerProfilePage() {
  if (!employerPortalEnabled()) notFound();
  const actor = await getActor();
  if (!actor) redirect("/auth/signin?callbackUrl=/employer/profile/edit");
  if (isAdmin(actor) && !actor.employer) redirect("/account/settings");
  if (!actor.employer) redirect("/employer");
  // Only an administrator lifts a suspension (D-037).
  if (isSuspendedEmployer(actor)) redirect("/employer/profile");

  const employer = actor.employer;

  return (
    <>
      <PageHeader
        title="Edit company details"
        description="The company details Daraja checks and shows on your vacancies."
        actions={<Link className={dash.button} href="/employer/profile">Back to company</Link>}
      />

      <EmployerVerificationNotice employer={employer} showProfileLink={false} />

      <section className={dash.card} aria-label="Company details">
        <p className={dash.help}>
          {employer.verificationStatus === "VERIFIED"
            ? "Saving changes sends your company for a new check. Vacancies that are already live stay live."
            : "Daraja checks these details before your vacancies go live."}
        </p>
        <div className={portal.formScope}>
          <EmployerProfileForm
            initial={employer}
            submitLabel={employer.verificationStatus === "REJECTED" ? "Send updated details" : "Save changes"}
          />
        </div>
      </section>
    </>
  );
}
