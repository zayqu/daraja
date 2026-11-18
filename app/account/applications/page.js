import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { candidateCareerEnabled, getCandidateUser } from "@/lib/candidate-access";
import { applicationState } from "@/lib/candidate-profile";
import WithdrawApplicationButton from "@/components/WithdrawApplicationButton";
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
  title: "My applications",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

const WITHDRAWABLE = new Set(["PENDING", "REVIEWED"]);

export default async function ApplicationsPage() {
  if (!candidateCareerEnabled()) notFound();
  const user = await getCandidateUser();
  if (!user) redirect("/auth/signin?callbackUrl=/account/applications");

  const now = new Date();
  const applications = user.jobSeeker
    ? await prisma.application.findMany({
        where: { jobSeekerId: user.jobSeeker.id },
        orderBy: { createdAt: "desc" },
        take: 200,
        select: {
          id: true,
          status: true,
          createdAt: true,
          job: { select: { id: true, slug: true, title: true, company: true, location: true, deadline: true } },
        },
      })
    : [];

  return (
    <>
      <PageHeader
        title="My applications"
        description="Applications you sent through Daraja and where each one stands."
        actions={<Link className={dash.buttonPrimary} href="/jobs">Find jobs</Link>}
      />
      <Panel title={`${applications.length} application${applications.length === 1 ? "" : "s"}`}>
        {applications.length ? (
          <ListRows>
            {applications.map((application) => {
              const state = applicationState(application.status);
              const job = application.job;
              return (
                <ListRow
                  key={application.id}
                  title={job.title}
                  href={`/jobs/${job.slug || job.id}`}
                  subtitle={job.company}
                  meta={[job.location, `Applied ${formatDate(application.createdAt)}`, closingLabel(job.deadline, now)]}
                  badge={<Badge tone={state.tone}>{state.label}</Badge>}
                  actions={
                    WITHDRAWABLE.has(application.status) ? (
                      <WithdrawApplicationButton applicationId={application.id} title={job.title} />
                    ) : null
                  }
                />
              );
            })}
          </ListRows>
        ) : (
          <EmptyState
            title="No applications on Daraja yet"
            text="Applications you send through Daraja appear here with their status. Many vacancies take you to the employer's own application page instead; keep track of those by saving the job."
            action={<Link className={dash.button} href="/jobs">Browse jobs</Link>}
          />
        )}
      </Panel>
    </>
  );
}
