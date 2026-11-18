import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  employerPortalEnabled,
  getActor,
  isAdmin,
  isSuspendedEmployer,
  publishesWithoutReview,
} from "@/lib/employer-access";
import EmployerProfileForm from "@/components/EmployerProfileForm";
import EmployerVerificationNotice from "@/components/EmployerVerificationNotice";
import AccountMenu from "@/components/dashboard/AccountMenu";
import { Badge, ListCard, PageHeader } from "@/components/dashboard/DashboardUi";
import dash from "@/components/dashboard/dashboard.module.css";
import portal from "../../portal.module.css";

export const metadata = {
  title: "Company profile",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

const STATUS = {
  PENDING: ["amber", "Being checked"],
  VERIFIED: ["green", "Verified"],
  REJECTED: ["red", "Changes needed"],
  SUSPENDED: ["red", "Suspended"],
};

export default async function EmployerProfilePage() {
  if (!employerPortalEnabled()) notFound();
  const actor = await getActor();
  if (!actor) redirect("/auth/signin?callbackUrl=/employer/profile");
  if (isAdmin(actor) && !actor.employer) redirect("/account/settings");
  if (!actor.employer) redirect("/employer");

  const employer = actor.employer;
  const [tone, label] = STATUS[employer.verificationStatus] || STATUS.PENDING;
  const suspended = isSuspendedEmployer(actor);

  return (
    <>
      <PageHeader
        title="Company profile"
        description="The company details Daraja checked and shows on your vacancies."
      />

      <EmployerVerificationNotice employer={employer} showProfileLink={false} />

      <div className={dash.overviewBottom}>
        <section className={dash.card} aria-labelledby="company-form-title">
          <div className={dash.cardHead}>
            <h2 id="company-form-title" className={dash.cardTitle}>Company details</h2>
            <Badge tone={tone}>{label}</Badge>
          </div>
          {suspended ? (
            <p className={dash.help}>Company details can&apos;t be changed while the account is suspended.</p>
          ) : (
            <>
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
            </>
          )}
        </section>

        <ListCard title="Your account" footer={<Link href="/account/settings">Account settings →</Link>}>
          <dl className={dash.detailList}>
            <div>
              <dt>Sign-in email</dt>
              <dd>{actor.email}</dd>
            </div>
            <div>
              <dt>Publishing</dt>
              <dd>
                {publishesWithoutReview(employer)
                  ? "Trusted: your vacancies go live as soon as you submit them."
                  : "Daraja reviews each new vacancy before it goes live."}
              </dd>
            </div>
            <div>
              <dt>Candidate privacy</dt>
              <dd>
                Employer accounts do not get open access to candidate CVs or private
                details. You see them only through a candidate&apos;s application or
                with their consent.
              </dd>
            </div>
          </dl>
        </ListCard>
      </div>

      <AccountMenu role={actor.role} />
    </>
  );
}
