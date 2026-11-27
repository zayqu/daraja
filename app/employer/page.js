import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import {
  employerPortalEnabled,
  getActor,
  isAdmin,
  isSuspendedEmployer,
  publishesWithoutReview,
} from "@/lib/employer-access";
import { EMPLOYER_EDITABLE_STATUSES, vacancyState } from "@/lib/employer-vacancy";
import EmployerProfileForm from "@/components/EmployerProfileForm";
import EmployerVerificationNotice from "@/components/EmployerVerificationNotice";
import {
  Badge,
  DaysLeftBadge,
  DonutCard,
  EmptyState,
  HighlightStats,
  ListCard,
  ListRow,
  ListRows,
  PageHeader,
  closingLabel,
} from "@/components/dashboard/DashboardUi";
import dash from "@/components/dashboard/dashboard.module.css";
import prisma from "@/lib/prisma";
import portal from "../portal.module.css";

export const metadata = {
  title: "Employer dashboard",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

const VERIFICATION_BADGE = {
  PENDING: ["amber", "Being checked"],
  VERIFIED: ["green", "Verified"],
  REJECTED: ["red", "Changes needed"],
  SUSPENDED: ["red", "Suspended"],
};

// First visit: the company details form and how posting works.
function EmployerSetup() {
  return (
    <>
      <PageHeader
        title="Create your employer profile"
        description="Tell us about your company. Once Daraja has checked it, your vacancies can go live."
      />
      <div className={dash.overviewBottom}>
        <section className={dash.card} aria-labelledby="company-details-title">
          <h2 id="company-details-title" className={dash.cardTitle}>Your company details</h2>
          <p className={dash.help}>
            Daraja checks every company before its vacancies go live. This keeps
            fake jobs off Daraja.
          </p>
          <div className={portal.formScope}>
            <EmployerProfileForm />
          </div>
        </section>
        <section className={dash.card} aria-labelledby="how-posting-works">
          <h2 id="how-posting-works" className={dash.cardTitle}>How posting works</h2>
          <ol className={portal.steps}>
            <li>Send your company details.</li>
            <li>Daraja checks your company.</li>
            <li>Create vacancies and follow each one from review to live.</li>
          </ol>
          <div className={dash.cardFooter}>
            <p className={dash.help}>
              Employer accounts do not get open access to candidate CVs or private
              details. You see them only through a candidate&apos;s application or
              with their consent.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}

export default async function EmployerPage() {
  if (!employerPortalEnabled()) notFound();

  const actor = await getActor();
  if (!actor) redirect("/auth/signin?callbackUrl=/employer");
  // Administrators have their own dashboard and post jobs from /admin.
  if (isAdmin(actor) && !actor.employer) redirect("/admin");
  if (!actor.employer) return <EmployerSetup />;

  const employer = actor.employer;
  const now = new Date();
  const vacancies = await prisma.job.findMany({
    where: { employerId: actor.employer.id },
    orderBy: { updatedAt: "desc" },
    take: 100,
    select: {
      id: true,
      slug: true,
      title: true,
      location: true,
      deadline: true,
      moderationStatus: true,
      moderationNote: true,
      active: true,
    },
  });

  const counts = { live: 0, review: 0, changes: 0, closed: 0, draft: 0 };
  for (const job of vacancies) counts[vacancyState(job, now).key] += 1;
  const closingSoon = vacancies
    .filter((job) => vacancyState(job, now).key === "live" && job.deadline)
    .sort((a, b) => a.deadline - b.deadline)
    .slice(0, 3);
  const canEdit = !isSuspendedEmployer(actor);
  const [badgeTone, badgeLabel] = VERIFICATION_BADGE[employer.verificationStatus] || VERIFICATION_BADGE.PENDING;

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`Welcome back, ${employer.companyName}. Here is how your vacancies are doing.`}
        actions={canEdit ? <Link className={dash.buttonPrimary} href="/post-job">Post a job</Link> : null}
      />

      <EmployerVerificationNotice employer={employer} />

      <div className={dash.overviewTop}>
        <HighlightStats
          items={[
            { icon: "jobs", value: counts.live, label: "Live vacancies", href: "/employer/vacancies?status=live" },
            { icon: "document", value: counts.review, label: "In review", href: "/employer/vacancies?status=review" },
          ]}
        />
        <DonutCard
          title="Your vacancies"
          segments={[
            { label: "Live", value: counts.live, tone: "teal" },
            { label: "In review", value: counts.review, tone: "amber" },
            { label: "Not approved", value: counts.changes, tone: "red" },
            { label: "Closed", value: counts.closed + counts.draft, tone: "gray" },
          ]}
          footer={<Link href="/employer/vacancies">View all vacancies →</Link>}
        />
        <ListCard title="Closing soon" footer={<Link href="/employer/vacancies?status=live">Live vacancies →</Link>}>
          {closingSoon.length ? (
            <ListRows>
              {closingSoon.map((job) => (
                <ListRow
                  key={job.id}
                  title={job.title}
                  avatarText={job.title}
                  href={`/jobs/${job.slug || job.id}`}
                  subtitle={job.location}
                  badge={<DaysLeftBadge date={job.deadline} now={now} />}
                />
              ))}
            </ListRows>
          ) : (
            <EmptyState title="Nothing closing soon" text="Live vacancies and their closing dates appear here." />
          )}
        </ListCard>
      </div>

      <div className={dash.overviewBottom}>
        <ListCard title="Recent vacancies" footer={<Link href="/employer/vacancies">View all vacancies →</Link>}>
          {vacancies.length ? (
            <ListRows>
              {vacancies.slice(0, 5).map((job) => {
                const state = vacancyState(job, now);
                return (
                  <ListRow
                    key={job.id}
                    title={job.title}
                    avatarText={job.title}
                    href={state.key === "live" ? `/jobs/${job.slug || job.id}` : null}
                    subtitle={job.location}
                    meta={[closingLabel(job.deadline, now)]}
                    badge={<Badge tone={state.tone}>{state.label}</Badge>}
                    actions={
                      canEdit && EMPLOYER_EDITABLE_STATUSES.has(job.moderationStatus) ? (
                        <Link className={dash.button} href={`/employer/vacancies/${job.id}`}>Edit</Link>
                      ) : null
                    }
                  />
                );
              })}
            </ListRows>
          ) : (
            <EmptyState
              title="No vacancies yet"
              text="Create your first vacancy. Daraja reviews it before it goes live."
              action={canEdit ? <Link className={dash.buttonPrimary} href="/post-job">Post a job</Link> : null}
            />
          )}
        </ListCard>

        <ListCard
          title="Company profile"
          action={<Badge tone={badgeTone}>{badgeLabel}</Badge>}
          footer={<Link href="/employer/profile">Manage company profile →</Link>}
        >
          <dl className={dash.detailList}>
            <div>
              <dt>Company</dt>
              <dd>{employer.companyName}</dd>
            </div>
            <div>
              <dt>Industry</dt>
              <dd>{employer.industry || "Not added"}</dd>
            </div>
            <div>
              <dt>Website</dt>
              <dd>{employer.website || "Not added"}</dd>
            </div>
            <div>
              <dt>Account</dt>
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
          </dl>
        </ListCard>
      </div>
    </>
  );
}
