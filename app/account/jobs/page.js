import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { candidateCareerEnabled, getCandidateUser } from "@/lib/candidate-access";
import { applicationState } from "@/lib/candidate-profile";
import SaveJobButton from "@/components/SaveJobButton";
import WithdrawApplicationButton from "@/components/WithdrawApplicationButton";
import { Badge, EmptyState, PageHeader } from "@/components/dashboard/DashboardUi";
import JobCard from "@/components/ui/JobCard";
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
// Everything the shared JobCard shows (stated facts only, D-029).
const JOB_FIELDS = {
  id: true,
  slug: true,
  title: true,
  company: true,
  location: true,
  category: true,
  type: true,
  salary: true,
  experienceMinYears: true,
  experienceMaxYears: true,
  openings: true,
  deadline: true,
  active: true,
  featured: true,
  source: true,
  companyLogo: true,
  representativeImage: true,
  createdAt: true,
};
// JobCard is a client component, so dates cross the boundary as strings.
const cardJob = (job) => ({
  ...job,
  deadline: job.deadline ? job.deadline.toISOString() : null,
  createdAt: job.createdAt.toISOString(),
});

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

      <div className={dash.filterBar}>
        <form className={dash.searchField} action="/account/jobs" role="search">
          <input type="hidden" name="tab" value={tab} />
          <NavIcon name="search" size={18} />
          <input type="search" name="q" defaultValue={query} placeholder="Search my jobs" aria-label="Search my jobs" />
        </form>
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
      </div>

        {shown.length ? (
          <div className={dash.jobList}>
            {shown.map((item) => {
              const { job } = item;
              const open = isOpen(job);
              if (item.kind === "saved") {
                return (
                  <JobCard
                    key={`saved-${item.id}`}
                    job={cardJob(job)}
                    listName="My jobs saved"
                    linked={open}
                    status={open ? null : <Badge tone="gray">Closed</Badge>}
                    actions={
                      <SaveJobButton
                        jobId={job.id}
                        initialSaved
                        className={dash.button}
                        refreshOnChange
                        savedLabel="Remove"
                      />
                    }
                  />
                );
              }
              const state = applicationState(item.status);
              return (
                <JobCard
                  key={`application-${item.id}`}
                  job={cardJob(job)}
                  listName="My jobs applications"
                  linked={open}
                  status={<Badge tone={state.tone}>{state.label}</Badge>}
                  actions={
                    WITHDRAWABLE.has(item.status) ? (
                      <WithdrawApplicationButton applicationId={item.id} title={job.title} />
                    ) : null
                  }
                />
              );
            })}
          </div>
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

      <aside className={dash.reminder}>
        <span className={dash.reminderIcon} aria-hidden="true"><NavIcon name="alert" size={20} /></span>
        <div>
          <strong>Never miss a new vacancy</strong>
          <p>Get new jobs in your field by email, and pause or stop the alerts any time.</p>
        </div>
        <Link className={dash.button} href="/account/alerts">Job alerts</Link>
      </aside>
    </>
  );
}
