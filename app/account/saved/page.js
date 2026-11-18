import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { candidateCareerEnabled, getCandidateUser } from "@/lib/candidate-access";
import SaveJobButton from "@/components/SaveJobButton";
import {
  Badge,
  DaysLeftBadge,
  EmptyState,
  ListRow,
  ListRows,
  PageHeader,
  Panel,
  closingLabel,
} from "@/components/dashboard/DashboardUi";
import dash from "@/components/dashboard/dashboard.module.css";
import prisma from "@/lib/prisma";

export const metadata = {
  title: "Saved jobs",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function SavedJobsPage() {
  if (!candidateCareerEnabled()) notFound();
  const user = await getCandidateUser();
  if (!user) redirect("/auth/signin?callbackUrl=/account/saved");

  const now = new Date();
  const savedJobs = await prisma.savedJob.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      job: { select: { id: true, slug: true, title: true, company: true, location: true, deadline: true, active: true } },
    },
  });

  return (
    <>
      <PageHeader
        title="Saved jobs"
        description="Jobs you saved, with how long you have left to apply."
        actions={<Link className={dash.buttonPrimary} href="/jobs">Find jobs</Link>}
      />
      <Panel title={`${savedJobs.length} saved job${savedJobs.length === 1 ? "" : "s"}`}>
        {savedJobs.length ? (
          <ListRows>
            {savedJobs.map(({ id, job }) => (
              <ListRow
                key={id}
                title={job.title}
                href={`/jobs/${job.slug || job.id}`}
                subtitle={job.company}
                meta={[job.location, closingLabel(job.deadline, now)]}
                badge={job.active ? <DaysLeftBadge date={job.deadline} now={now} /> : <Badge tone="gray">Closed</Badge>}
                actions={<SaveJobButton jobId={job.id} initialSaved className={dash.buttonGhost} refreshOnChange savedLabel="Remove" />}
              />
            ))}
          </ListRows>
        ) : (
          <EmptyState
            title="No saved jobs yet"
            text="Tap Save job on any vacancy to keep it here and see when it closes."
            action={<Link className={dash.button} href="/jobs">Browse jobs</Link>}
          />
        )}
      </Panel>
    </>
  );
}
