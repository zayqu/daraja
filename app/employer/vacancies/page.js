import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  employerPortalEnabled,
  getActor,
  isAdmin,
  isSuspendedEmployer,
} from "@/lib/employer-access";
import { EMPLOYER_EDITABLE_STATUSES, vacancyState } from "@/lib/employer-vacancy";
import EmployerVerificationNotice from "@/components/EmployerVerificationNotice";
import WithdrawVacancyButton from "@/components/WithdrawVacancyButton";
import {
  Badge,
  EmptyState,
  ListRow,
  ListRows,
  PageHeader,
  Panel,
  closingLabel,
  formatDate,
} from "@/components/dashboard/DashboardUi";
import dash from "@/components/dashboard/dashboard.module.css";
import prisma from "@/lib/prisma";

export const metadata = {
  title: "My vacancies",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

const FILTERS = [
  ["all", "All"],
  ["live", "Live"],
  ["review", "In review"],
  ["changes", "Not approved"],
  ["closed", "Closed"],
];

export default async function EmployerVacanciesPage({ searchParams }) {
  if (!employerPortalEnabled()) notFound();
  const actor = await getActor();
  if (!actor) redirect("/auth/signin?callbackUrl=/employer/vacancies");
  if (isAdmin(actor) && !actor.employer) redirect("/admin/jobs");
  if (!actor.employer) redirect("/employer");

  const params = await searchParams;
  const filter = FILTERS.some(([key]) => key === params?.status) ? params.status : "all";
  const now = new Date();
  const vacancies = await prisma.job.findMany({
    where: { employerId: actor.employer.id },
    orderBy: { updatedAt: "desc" },
    take: 200,
    select: {
      id: true,
      slug: true,
      title: true,
      location: true,
      deadline: true,
      createdAt: true,
      moderationStatus: true,
      moderationNote: true,
      active: true,
    },
  });
  const shown = vacancies.filter((job) => {
    const key = vacancyState(job, now).key;
    if (filter === "all") return true;
    if (filter === "closed") return key === "closed" || key === "draft";
    return key === filter;
  });
  const canEdit = !isSuspendedEmployer(actor);

  return (
    <>
      <PageHeader
        title="My vacancies"
        description="Edit a vacancy that isn't live yet, send it again for review, or close one you no longer need."
        actions={canEdit ? <Link className={dash.buttonPrimary} href="/post-job">Post a job</Link> : null}
      />

      <EmployerVerificationNotice employer={actor.employer} />

      <Panel
        title={`${shown.length} vacanc${shown.length === 1 ? "y" : "ies"}`}
        actions={
          <nav className={dash.chips} aria-label="Filter vacancies">
            {FILTERS.map(([key, label]) => (
              <Link
                key={key}
                href={key === "all" ? "/employer/vacancies" : `/employer/vacancies?status=${key}`}
                className={`${dash.chip} ${filter === key ? dash.chipActive : ""}`}
                aria-current={filter === key ? "page" : undefined}
              >
                {label}
              </Link>
            ))}
          </nav>
        }
      >
        {shown.length ? (
          <ListRows>
            {shown.map((job) => {
              const state = vacancyState(job, now);
              const editable = canEdit && EMPLOYER_EDITABLE_STATUSES.has(job.moderationStatus);
              return (
                <ListRow
                  key={job.id}
                  title={job.title}
                  avatarText={job.title}
                  href={state.key === "live" ? `/jobs/${job.slug || job.id}` : null}
                  subtitle={job.location}
                  meta={[closingLabel(job.deadline, now), `Added ${formatDate(job.createdAt)}`]}
                  badge={<Badge tone={state.tone}>{state.label}</Badge>}
                  actions={
                    <>
                      {editable ? (
                        <Link className={dash.button} href={`/employer/vacancies/${job.id}`}>
                          {job.moderationStatus === "REJECTED" ? "Edit and send again" : "Edit"}
                        </Link>
                      ) : null}
                      {canEdit && state.key !== "closed" ? (
                        <WithdrawVacancyButton vacancyId={job.id} title={job.title} />
                      ) : null}
                    </>
                  }
                  note={
                    job.moderationStatus === "REJECTED" && job.moderationNote
                      ? `Daraja's note: ${job.moderationNote}`
                      : null
                  }
                />
              );
            })}
          </ListRows>
        ) : (
          <EmptyState
            title={filter === "all" ? "No vacancies yet" : "No vacancies here"}
            text={filter === "all" ? "Vacancies you create appear here with their review status." : "Try another filter."}
            action={canEdit && filter === "all" ? <Link className={dash.buttonPrimary} href="/post-job">Post a job</Link> : null}
          />
        )}
      </Panel>
    </>
  );
}
