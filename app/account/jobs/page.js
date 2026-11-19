import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { candidateCareerEnabled, getCandidateUser } from "@/lib/candidate-access";
import { applicationState } from "@/lib/candidate-profile";
import SaveJobButton from "@/components/SaveJobButton";
import WithdrawApplicationButton from "@/components/WithdrawApplicationButton";
import {
  Badge,
  DaysLeftBadge,
  EmptyState,
  ListRow,
  ListRows,
  PageHeader,
  Panel,
  closingLabel,
  formatDate,
} from "@/components/dashboard/DashboardUi";
import NavIcon from "@/components/ui/NavIcon";
import dash from "@/components/dashboard/dashboard.module.css";
import prisma from "@/lib/prisma";

export const metadata = {
  title: "My jobs",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

const TABS = [
  ["saved", "Saved"],
  ["applied", "Applied"],
  ["closed", "Closed"],
];
const ENDED = new Set(["REJECTED", "WITHDRAWN"]);
const WITHDRAWABLE = new Set(["PENDING", "REVIEWED"]);
const JOB_FIELDS = { id: true, slug: true, title: true, company: true, location: true, deadline: true, active: true };
const jobHref = (job) => `/jobs/${job.slug || job.id}`;

// One place for the jobs a candidate follows: saved jobs still open, applications
// still being considered, and everything that has closed or ended.
export default async function MyJobsPage({ searchParams }) {
  if (!candidateCareerEnabled()) notFound();
  const user = await getCandidateUser();
  if (!user) redirect("/auth/signin?callbackUrl=/account/jobs");

  const params = await searchParams;
  const tab = TABS.some(([key]) => key === params?.tab) ? params.tab : "saved";
  const query = typeof params?.q === "string" ? params.q.trim().slice(0, 80) : "";
  const now = new Date();

  const [saved, applications] = await Promise.all([
    prisma.savedJob.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: { id: true, job: { select: JOB_FIELDS } },
    }),
    user.jobSeeker
      ? prisma.application.findMany({
          where: { jobSeekerId: user.jobSeeker.id },
          orderBy: { createdAt: "desc" },
          take: 200,
          select: { id: true, status: true, createdAt: true, job: { select: JOB_FIELDS } },
        })
      : [],
  ]);

  const matches = ({ job }) =>
    !query || `${job.title} ${job.company}`.toLowerCase().includes(query.toLowerCase());
  const isOpen = (job) => job.active && job.deadline && job.deadline >= now;
  const lists = {
    saved: saved.filter((item) => isOpen(item.job)).map((item) => ({ ...item, kind: "saved" })),
    applied: applications.filter((item) => !ENDED.has(item.status)).map((item) => ({ ...item, kind: "application" })),
    closed: [
      ...applications.filter((item) => ENDED.has(item.status)).map((item) => ({ ...item, kind: "application" })),
      ...saved.filter((item) => !isOpen(item.job)).map((item) => ({ ...item, kind: "saved" })),
    ],
  };
  const shown = lists[tab].filter(matches);
  const tabHref = (key) => `/account/jobs?tab=${key}${query ? `&q=${encodeURIComponent(query)}` : ""}`;

  return (
    <>
      <PageHeader
        title="My jobs"
        description="Jobs you saved, applications you sent, and what has closed."
        actions={<Link className={dash.buttonPrimary} href="/jobs">Find jobs</Link>}
      />

      <form className={dash.searchField} action="/account/jobs" role="search">
        <input type="hidden" name="tab" value={tab} />
        <NavIcon name="search" size={18} />
        <input type="search" name="q" defaultValue={query} placeholder="Search my jobs" aria-label="Search my jobs" />
      </form>

      <Panel
        title={`${shown.length} job${shown.length === 1 ? "" : "s"}`}
        actions={
          <nav className={dash.chips} aria-label="My jobs">
            {TABS.map(([key, label]) => (
              <Link
                key={key}
                href={tabHref(key)}
                className={`${dash.chip} ${tab === key ? dash.chipActive : ""}`}
                aria-current={tab === key ? "page" : undefined}
              >
                {label} ({lists[key].length})
              </Link>
            ))}
          </nav>
        }
      >
        {shown.length ? (
          <ListRows>
            {shown.map((item) => {
              const { job } = item;
              if (item.kind === "saved") {
                const open = isOpen(job);
                return (
                  <ListRow
                    key={`saved-${item.id}`}
                    title={job.title}
                    href={open ? jobHref(job) : null}
                    subtitle={job.company}
                    meta={[job.location, closingLabel(job.deadline, now)]}
                    badge={open ? <DaysLeftBadge date={job.deadline} now={now} /> : <Badge tone="gray">Closed</Badge>}
                    actions={
                      <SaveJobButton
                        jobId={job.id}
                        initialSaved
                        className={dash.buttonGhost}
                        refreshOnChange
                        savedLabel="Remove"
                      />
                    }
                  />
                );
              }
              const state = applicationState(item.status);
              return (
                <ListRow
                  key={`application-${item.id}`}
                  title={job.title}
                  href={isOpen(job) ? jobHref(job) : null}
                  subtitle={job.company}
                  meta={[job.location, `Applied ${formatDate(item.createdAt)}`]}
                  badge={<Badge tone={state.tone}>{state.label}</Badge>}
                  actions={
                    WITHDRAWABLE.has(item.status) ? (
                      <WithdrawApplicationButton applicationId={item.id} title={job.title} />
                    ) : null
                  }
                />
              );
            })}
          </ListRows>
        ) : query ? (
          <EmptyState title="No matches" text="Try another word, or clear the search." />
        ) : tab === "saved" ? (
          <EmptyState
            title="No saved jobs yet"
            text="Tap Save on any job to keep it here and see when it closes."
            action={<Link className={dash.button} href="/jobs">Browse jobs</Link>}
          />
        ) : tab === "applied" ? (
          <EmptyState
            title="No applications on Daraja yet"
            text="Applications you send through Daraja appear here with their status. Many vacancies take you to the employer's own application page instead."
          />
        ) : (
          <EmptyState title="Nothing closed yet" text="Saved jobs that close and applications that end move here." />
        )}
      </Panel>
    </>
  );
}
