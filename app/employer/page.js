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
  EmptyState,
  PageHeader,
  Panel,
  StatCard,
  formatDate,
} from "@/components/dashboard/DashboardUi";
import NavIcon from "@/components/ui/NavIcon";
import { loadSiteSettings, siteSetting } from "@/lib/features";
import { viewTotalsByJob, weeklyChangeLabel, weeklyViews } from "@/lib/job-views";
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
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const weekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const [vacancies, applications, newApplications] = await Promise.all([
    prisma.job.findMany({
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
    }),
    prisma.application.groupBy({
      by: ["jobId"],
      where: { job: { employerId: actor.employer.id }, status: { not: "WITHDRAWN" } },
      _count: { _all: true },
    }),
    prisma.application.count({
      where: { job: { employerId: actor.employer.id }, status: { not: "WITHDRAWN" }, createdAt: { gte: weekAgo } },
    }),
  ]);
  const [viewsByJob, views] = await Promise.all([
    viewTotalsByJob(vacancies.map((job) => job.id)),
    weeklyViews({ employerId: actor.employer.id }, now),
    loadSiteSettings(),
  ]);

  const counts = { live: 0, review: 0, changes: 0, closed: 0, draft: 0 };
  for (const job of vacancies) counts[vacancyState(job, now).key] += 1;
  const closingThisWeek = vacancies.filter(
    (job) => vacancyState(job, now).key === "live" && job.deadline && job.deadline <= weekAhead,
  ).length;
  const appliesByJob = Object.fromEntries(applications.map((row) => [row.jobId, row._count._all]));
  const totalApplications = applications.reduce((sum, row) => sum + row._count._all, 0);
  const canEdit = !isSuspendedEmployer(actor);
  const instant = publishesWithoutReview(employer);
  const [badgeTone, badgeLabel] = VERIFICATION_BADGE[employer.verificationStatus] || VERIFICATION_BADGE.PENDING;
  const priceValue = siteSetting("promo.price");
  const price = (Number.isSafeInteger(priceValue) && priceValue > 0 ? priceValue : 30000).toLocaleString("en-GB");

  return (
    <>
      <PageHeader
        title={`Karibu, ${employer.companyName}`}
        description="Here is how your vacancies are doing this week."
        actions={
          canEdit ? (
            <>
              <Link className={dash.button} href="/advertise">Feature a vacancy</Link>
              <Link className={dash.buttonPrimary} href="/post-job">
                <NavIcon name="plus" size={18} />
                Post a job
              </Link>
            </>
          ) : null
        }
      />

      <EmployerVerificationNotice employer={employer} />

      <div className={dash.stats}>
        <StatCard
          icon="jobs"
          label="Live vacancies"
          value={counts.live}
          note={closingThisWeek ? `${closingThisWeek} ${closingThisWeek === 1 ? "closes" : "close"} this week` : "None closing this week"}
          tone={closingThisWeek ? "warning" : undefined}
          href="/employer/vacancies?status=live"
        />
        <StatCard
          icon="eye"
          label="Views this week"
          value={views.thisWeek.toLocaleString("en-GB")}
          note={weeklyChangeLabel(views)}
        />
        <StatCard
          icon="users"
          label="Applications"
          value={totalApplications.toLocaleString("en-GB")}
          note={`${newApplications} new this week`}
        />
        <StatCard
          icon="document"
          label="In review"
          value={counts.review}
          note={counts.changes ? `${counts.changes} not approved: fix and send again` : instant ? "Instant publishing is on" : "Daraja checks each one first"}
          tone={counts.changes ? "warning" : undefined}
          href={counts.changes ? "/employer/vacancies?status=changes" : "/employer/vacancies?status=review"}
        />
      </div>

      <div className={dash.overviewGrid}>
        <Panel
          title="Your vacancies"
          actions={vacancies.length ? <Link className={dash.linkArrow} href="/employer/vacancies">See all</Link> : null}
          flush
        >
          {vacancies.length ? (
            <div className={dash.tableWrap}>
              <table className={`${dash.table} ${dash.stackOnMobile} ${dash.vacancyTable}`}>
                <thead>
                  <tr>
                    <th>Vacancy</th>
                    <th>Status</th>
                    <th>Views</th>
                    <th>Applies</th>
                    <th>Closes</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {vacancies.slice(0, 6).map((job) => {
                    const state = vacancyState(job, now);
                    const editable = canEdit && EMPLOYER_EDITABLE_STATUSES.has(job.moderationStatus);
                    return (
                      <tr key={job.id}>
                        <td data-label="Vacancy">
                          <span className={dash.vacancyCell}>
                            <span className={dash.vacancyMark} aria-hidden="true">{(job.title || "?").trim()[0]?.toUpperCase()}</span>
                            <span>
                              {state.key === "live" ? (
                                <Link className={dash.primaryCell} href={`/jobs/${job.slug || job.id}`}>{job.title}</Link>
                              ) : (
                                <strong className={dash.primaryCell}>{job.title}</strong>
                              )}
                              {job.location ? <span className={dash.subtle}>{job.location}</span> : null}
                            </span>
                          </span>
                        </td>
                        <td data-label="Status"><Badge tone={state.tone}>{state.label}</Badge></td>
                        <td data-label="Views">{viewsByJob[job.id] ? viewsByJob[job.id].toLocaleString("en-GB") : "—"}</td>
                        <td data-label="Applies">
                          {appliesByJob[job.id] ? (
                            <Link className={dash.linkArrow} href={`/employer/vacancies/${job.id}/applicants`}>{appliesByJob[job.id]}</Link>
                          ) : "—"}
                        </td>
                        <td data-label="Closes">{job.deadline ? formatDate(job.deadline) : "—"}</td>
                        <td>
                          {editable ? (
                            <Link className={dash.button} href={`/employer/vacancies/${job.id}`}>Edit</Link>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="No vacancies yet"
              text={instant ? "Create your first vacancy. It goes live as soon as you send it." : "Create your first vacancy. Daraja checks it before it goes live."}
              action={canEdit ? <Link className={dash.buttonPrimary} href="/post-job">Post a job</Link> : null}
            />
          )}
        </Panel>

        <div className={dash.overviewSide}>
          <section className={dash.featureCard} aria-label="Featured vacancy">
            <span className={dash.featurePrice}>TSh {price}</span>
            <h2>Get your vacancy seen first</h2>
            <p>Feature it at the top of Ajira and on the DARAJA WhatsApp Channel.</p>
            <Link className={dash.featureAction} href="/advertise">Feature a vacancy</Link>
          </section>

          <section className={dash.card} aria-label="Company profile">
            <div className={dash.cardHead}>
              <h2 className={dash.cardTitle}>Company profile</h2>
            </div>
            <p className={dash.companyStatus}>
              <Badge tone={badgeTone}>{badgeLabel}</Badge>
              <span>{employer.verificationStatus === "VERIFIED" ? "Verified employer" : "Employer account"}</span>
            </p>
            <p className={dash.help}>
              {instant
                ? "Instant publishing is on: your vacancies go live without review."
                : "Daraja reviews each new vacancy before it goes live."}
            </p>
            <div className={dash.cardFooter}>
              <Link className={dash.button} href="/employer/profile">Edit company</Link>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
