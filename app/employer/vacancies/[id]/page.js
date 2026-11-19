import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  employerPortalEnabled,
  getActor,
  isSuspendedEmployer,
} from "@/lib/employer-access";
import {
  EMPLOYER_EDITABLE_STATUSES,
  vacancyFormValues,
  vacancyState,
} from "@/lib/employer-vacancy";
import EmployerVacancyForm from "@/components/EmployerVacancyForm";
import { Badge, Notice, PageHeader, daysUntil } from "@/components/dashboard/DashboardUi";
import dash from "@/components/dashboard/dashboard.module.css";
import { getCategoryNames } from "@/lib/public-jobs";
import prisma from "@/lib/prisma";
import portal from "../../../portal.module.css";

export const metadata = {
  title: "Edit vacancy",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function EditVacancyPage({ params }) {
  if (!employerPortalEnabled()) notFound();
  const { id } = await params;
  const actor = await getActor();
  if (!actor) redirect(`/auth/signin?callbackUrl=${encodeURIComponent(`/employer/vacancies/${id}`)}`);
  if (!actor.employer) redirect("/employer");
  if (isSuspendedEmployer(actor)) redirect("/employer");

  // Only the signed-in employer's own vacancies can be opened here.
  const job = await prisma.job.findFirst({
    where: { id, employerId: actor.employer.id },
    select: {
      id: true,
      slug: true,
      title: true,
      location: true,
      category: true,
      type: true,
      description: true,
      deadline: true,
      applicationUrl: true,
      moderationStatus: true,
      moderationNote: true,
      active: true,
    },
  });
  if (!job) notFound();

  const state = vacancyState(job);
  const back = <Link className={dash.button} href="/employer/vacancies">Back to my vacancies</Link>;

  if (!EMPLOYER_EDITABLE_STATUSES.has(job.moderationStatus)) {
    return (
      <>
        <PageHeader title={job.title} description="This vacancy can no longer be edited here." actions={back} />
        <Notice
          tone="info"
          title={state.key === "live" ? "This vacancy is live" : "This vacancy is closed"}
          action={
            state.key === "live" ? (
              <Link className={dash.linkArrow} href={`/jobs/${job.slug || job.id}`}>View it on Daraja →</Link>
            ) : null
          }
        >
          {state.key === "live"
            ? "To change a live vacancy, contact Daraja. You can also close it from My vacancies and post a new one."
            : "Closed vacancies stay in your list for your records."}
        </Notice>
      </>
    );
  }

  const expired = job.deadline && daysUntil(job.deadline) < 0;

  return (
    <>
      <PageHeader
        title="Edit vacancy"
        description="Save your changes to send the vacancy to Daraja for review."
        actions={back}
      />

      {job.moderationStatus === "REJECTED" ? (
        <Notice tone="danger" title="Daraja did not approve this vacancy">
          {job.moderationNote ? `Daraja's note: ${job.moderationNote}` : "Check the details below and send it again."}
        </Notice>
      ) : (
        <Notice tone="info" title="Status">
          <Badge tone={state.tone}>{state.label}</Badge>
        </Notice>
      )}
      {expired ? (
        <Notice tone="warning" title="The closing date has passed">
          Choose a new closing date before sending this vacancy again.
        </Notice>
      ) : null}

      <section className={`${dash.card} ${portal.formScope}`} aria-label="Vacancy details">
        <EmployerVacancyForm
          companyName={actor.employer.companyName}
          categories={await getCategoryNames()}
          vacancyId={job.id}
          initialValues={vacancyFormValues(job)}
        />
      </section>
    </>
  );
}
