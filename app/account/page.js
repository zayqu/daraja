import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { candidateCareerEnabled } from "@/lib/candidate-access";
import { employerPortalEnabled } from "@/lib/features";
import { roleHome } from "@/lib/platform-roles";
import {
  applicationState,
  candidateProfileSelect,
  profileProgress,
} from "@/lib/candidate-profile";
import {
  Badge,
  DaysLeftBadge,
  DonutCard,
  EmptyState,
  HighlightStats,
  ListCard,
  ListRow,
  ListRows,
  Notice,
  PageHeader,
  formatDate,
} from "@/components/dashboard/DashboardUi";
import dash from "@/components/dashboard/dashboard.module.css";
import prisma from "@/lib/prisma";

export const metadata = {
  title: "My account",
  description: "Your Daraja job search dashboard: applications, saved jobs, CVs and alerts.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const JOB_FIELDS = { id: true, slug: true, title: true, company: true, location: true, deadline: true, active: true };
const jobHref = (job) => `/jobs/${job.slug || job.id}`;

async function loadCandidateDashboard(userId, now) {
  const profile = await prisma.jobSeeker.findUnique({
    where: { userId },
    select: candidateProfileSelect,
  });
  const [applications, statusCounts, savedJobs, savedCount, closingSoon, cvCount] = await Promise.all([
    profile
      ? prisma.application.findMany({
          where: { jobSeekerId: profile.id },
          orderBy: { createdAt: "desc" },
          take: 5,
          select: { id: true, status: true, createdAt: true, job: { select: JOB_FIELDS } },
        })
      : [],
    profile
      ? prisma.application.groupBy({
          by: ["status"],
          where: { jobSeekerId: profile.id },
          _count: { _all: true },
        })
      : [],
    prisma.savedJob.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, job: { select: JOB_FIELDS } },
    }),
    prisma.savedJob.count({ where: { userId } }),
    prisma.savedJob.findMany({
      where: { userId, job: { active: true, deadline: { gte: now } } },
      orderBy: { job: { deadline: "asc" } },
      take: 3,
      select: { id: true, job: { select: JOB_FIELDS } },
    }),
    profile ? prisma.candidateCv.count({ where: { jobSeekerId: profile.id } }) : 0,
  ]);
  return { profile, applications, statusCounts, savedJobs, savedCount, closingSoon, cvCount };
}

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=/account");
  }

  // Admins and employers have their own dashboards.
  const home = roleHome(session.user.role, { employerPortal: employerPortalEnabled() });
  if (home !== "/account") redirect(home);

  const careerEnabled = candidateCareerEnabled();
  const alert = await prisma.jobAlertSubscriber.findUnique({
    where: { userId: session.user.id },
    select: { active: true },
  });

  if (!careerEnabled) {
    return (
      <>
        <PageHeader title="Dashboard" description="Manage your job alerts and account." />
        <div className={dash.overviewBottom}>
          <ListCard title="Job alerts" footer={<Link href="/account/alerts">Manage job alerts →</Link>}>
            <EmptyState
              title={alert?.active ? "Your job alerts are on" : "Job alerts are off"}
              text="Choose the kinds of jobs Daraja should email you about."
            />
          </ListCard>
          <ListCard title="Account" footer={<Link href="/account/settings">Settings →</Link>}>
            <EmptyState title={session.user.email} text="Update your password, download your data or sign out." />
          </ListCard>
        </div>
      </>
    );
  }

  const now = new Date();
  const data = await loadCandidateDashboard(session.user.id, now);
  const progress = profileProgress(data.profile);
  const firstName = (data.profile?.fullName || session.user.name || "").trim().split(/\s+/)[0];
  const groups = { review: 0, shortlisted: 0, closed: 0, withdrawn: 0 };
  let applicationTotal = 0;
  for (const row of data.statusCounts) {
    groups[applicationState(row.status).group] += row._count._all;
    applicationTotal += row._count._all;
  }

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`${firstName ? `Welcome back, ${firstName}. ` : ""}Here is your job search at a glance.`}
        actions={<Link className={dash.buttonPrimary} href="/jobs">Find jobs</Link>}
      />

      {progress.complete < progress.total ? (
        <Notice
          tone="info"
          title={`Your profile is ${progress.complete} of ${progress.total} complete`}
          action={<Link className={dash.linkArrow} href="/account/profile">Complete your profile →</Link>}
        >
          A complete profile fills your CV for you and helps employers understand you when you apply.
        </Notice>
      ) : null}

      <div className={dash.overviewTop}>
        <HighlightStats
          items={[
            { icon: "document", value: applicationTotal, label: "Applications sent", href: "/account/applications" },
            { icon: "bookmark", value: data.savedCount, label: "Saved jobs", href: "/account/saved" },
          ]}
        />
        <DonutCard
          title="Your applications"
          segments={[
            { label: "In review", value: groups.review, tone: "amber" },
            { label: "Shortlisted", value: groups.shortlisted, tone: "teal" },
            { label: "Not selected", value: groups.closed, tone: "red" },
            { label: "Withdrawn", value: groups.withdrawn, tone: "gray" },
          ]}
          footer={<Link href="/account/applications">View all applications →</Link>}
        />
        <ListCard title="Closing soon" footer={<Link href="/account/saved">Saved jobs →</Link>}>
          {data.closingSoon.length ? (
            <ListRows>
              {data.closingSoon.map(({ id, job }) => (
                <ListRow
                  key={id}
                  title={job.title}
                  href={jobHref(job)}
                  subtitle={job.company}
                  badge={<DaysLeftBadge date={job.deadline} now={now} />}
                />
              ))}
            </ListRows>
          ) : (
            <EmptyState title="Nothing closing soon" text="Save jobs to see their closing dates here." />
          )}
        </ListCard>
      </div>

      <div className={dash.overviewBottom}>
        <ListCard title="Recent applications" footer={<Link href="/account/applications">View all applications →</Link>}>
          {data.applications.length ? (
            <ListRows>
              {data.applications.map((application) => {
                const state = applicationState(application.status);
                return (
                  <ListRow
                    key={application.id}
                    title={application.job.title}
                    href={jobHref(application.job)}
                    subtitle={application.job.company}
                    meta={[application.job.location, `Applied ${formatDate(application.createdAt)}`]}
                    badge={<Badge tone={state.tone}>{state.label}</Badge>}
                  />
                );
              })}
            </ListRows>
          ) : (
            <EmptyState
              title="No applications on Daraja yet"
              text="Applications you send through Daraja appear here with their status. Many vacancies take you to the employer's own application page instead."
              action={<Link className={dash.button} href="/jobs">Browse jobs</Link>}
            />
          )}
        </ListCard>

        <ListCard title="Saved jobs" footer={<Link href="/account/saved">View saved jobs →</Link>}>
          {data.savedJobs.length ? (
            <ListRows>
              {data.savedJobs.map(({ id, job }) => (
                <ListRow
                  key={id}
                  title={job.title}
                  href={jobHref(job)}
                  subtitle={job.company}
                  meta={[job.location]}
                  badge={job.active ? <DaysLeftBadge date={job.deadline} now={now} /> : <Badge tone="gray">Closed</Badge>}
                />
              ))}
            </ListRows>
          ) : (
            <EmptyState
              title="No saved jobs yet"
              text="Tap Save on any job to keep it here and see when it closes."
              action={<Link className={dash.button} href="/jobs">Browse jobs</Link>}
            />
          )}
        </ListCard>
      </div>

      <div className={dash.overviewBottom}>
        <ListCard title="CV Builder" footer={<Link href="/account/career/cv">Open CV Builder →</Link>}>
          <EmptyState
            title={data.cvCount ? `${data.cvCount} CV${data.cvCount === 1 ? "" : "s"} ready` : "Build your first CV"}
            text="Create an ATS-ready CV from your profile and tailor a copy for each job."
          />
        </ListCard>
        <ListCard title="Job alerts" footer={<Link href="/account/alerts">Manage job alerts →</Link>}>
          <EmptyState
            title={alert?.active ? "Your job alerts are on" : "Job alerts are off"}
            text="Choose the kinds of jobs Daraja should email you about, and pause them whenever you like."
          />
        </ListCard>
      </div>
    </>
  );
}
