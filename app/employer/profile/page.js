import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  employerPortalEnabled,
  getActor,
  isAdmin,
  isSuspendedEmployer,
  publishesWithoutReview,
} from "@/lib/employer-access";
import EmployerVerificationNotice from "@/components/EmployerVerificationNotice";
import ProfileMenu from "@/components/dashboard/ProfileMenu";
import { Badge, ListCard, PageHeader } from "@/components/dashboard/DashboardUi";
import dash from "@/components/dashboard/dashboard.module.css";

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

function initialsOf(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length > 1) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return (parts[0] || "D").slice(0, 2).toUpperCase();
}

// The employer's Account tab (Makarya pattern, D-038): the company at a
// glance. Editing happens on /employer/profile/edit; the gear menu also leads
// to Account settings.
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
        title="Company"
        actions={
          <ProfileMenu
            items={[
              ...(suspended ? [] : [{ href: "/employer/profile/edit", label: "Edit company details", icon: "employer" }]),
              { href: "/account/settings", label: "Account settings", icon: "settings" },
            ]}
          />
        }
      />

      <section className={dash.identity} aria-label="Your company">
        <span className={dash.identityAvatar} aria-hidden="true">{initialsOf(employer.companyName)}</span>
        <h2>{employer.companyName}</h2>
        {employer.industry ? <p>{employer.industry}</p> : null}
        <Badge tone={tone}>{label}</Badge>
      </section>

      <EmployerVerificationNotice employer={employer} />

      <ListCard
        title="Company details"
        footer={suspended ? null : <Link href="/employer/profile/edit">Edit company details →</Link>}
      >
        <dl className={dash.detailList}>
          <div>
            <dt>Website</dt>
            <dd>{employer.website || "Not added"}</dd>
          </div>
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
    </>
  );
}
