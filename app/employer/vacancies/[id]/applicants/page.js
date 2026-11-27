import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { employerPortalEnabled, getActor } from "@/lib/employer-access";
import { Badge, EmptyState, PageHeader, formatDate } from "@/components/dashboard/DashboardUi";
import ApplicantStatus from "@/components/ApplicantStatus";
import CvPreview from "@/components/CvPreview";
import dash from "@/components/dashboard/dashboard.module.css";
import cvStyles from "@/components/CvBuilder.module.css";
import prisma from "@/lib/prisma";
import styles from "./applicants.module.css";

export const metadata = {
  title: "Applicants",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

function initials(name) {
  const words = String(name || "?").trim().split(/\s+/).filter(Boolean);
  return ((words[0]?.[0] || "?") + (words[1]?.[0] || "")).toUpperCase();
}

// Applications sent with Apply with Daraja CV to one of this employer's
// vacancies: the CV exactly as sent, the cover letter and a status the
// candidate sees in My jobs. Employers see candidates only through this.
export default async function VacancyApplicantsPage({ params }) {
  if (!employerPortalEnabled()) notFound();
  const { id } = await params;
  const actor = await getActor();
  if (!actor) redirect(`/auth/signin?callbackUrl=${encodeURIComponent(`/employer/vacancies/${id}/applicants`)}`);
  if (!actor.employer) redirect("/employer");

  const job = await prisma.job.findFirst({
    where: { id, employerId: actor.employer.id },
    select: { id: true, slug: true, title: true, location: true },
  });
  if (!job) notFound();

  const applications = await prisma.application.findMany({
    where: { jobId: job.id },
    orderBy: [{ matchScore: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
    take: 200,
    select: {
      id: true,
      status: true,
      createdAt: true,
      coverLetter: true,
      cvSnapshot: true,
      atsScore: true,
      matchScore: true,
      jobSeeker: { select: { fullName: true, headline: true, location: true } },
    },
  });
  const active = applications.filter((item) => item.status !== "WITHDRAWN");

  return (
    <>
      <PageHeader
        title={`Applicants · ${job.title}`}
        description={`${active.length} ${active.length === 1 ? "application" : "applications"} through Daraja, best match first.`}
        actions={<Link className={dash.button} href="/employer/vacancies">Back to my vacancies</Link>}
      />

      {applications.length ? (
        <ul className={styles.list}>
          {applications.map((item) => {
            const snapshot = item.cvSnapshot || null;
            const personal = snapshot?.content?.personal || {};
            const name = personal.fullName || item.jobSeeker.fullName;
            const contact = [personal.phone, personal.email].filter(Boolean);
            return (
              <li key={item.id} className={`${styles.card} ${item.status === "WITHDRAWN" ? styles.withdrawn : ""}`}>
                <div className={styles.head}>
                  <span className={styles.avatar} aria-hidden="true">{initials(name)}</span>
                  <div className={styles.who}>
                    <strong>{name}</strong>
                    <span>
                      {[personal.headline || item.jobSeeker.headline, personal.location || item.jobSeeker.location]
                        .filter(Boolean)
                        .join(" · ") || "Candidate"}
                    </span>
                    <small>Applied {formatDate(item.createdAt)}</small>
                  </div>
                  <div className={styles.scores}>
                    {item.matchScore != null ? <Badge tone="green">{item.matchScore}% match</Badge> : null}
                    {item.atsScore != null ? <Badge tone="blue">ATS {item.atsScore}</Badge> : null}
                  </div>
                  <ApplicantStatus applicationId={item.id} status={item.status} />
                </div>

                {contact.length ? (
                  <p className={styles.contact}>
                    {personal.phone ? <a href={`tel:${personal.phone.replace(/\s+/g, "")}`}>{personal.phone}</a> : null}
                    {personal.email ? <a href={`mailto:${personal.email}`}>{personal.email}</a> : null}
                  </p>
                ) : null}

                {item.coverLetter ? (
                  <details className={styles.more}>
                    <summary>Cover letter</summary>
                    <p className={styles.letter}>{item.coverLetter}</p>
                  </details>
                ) : null}

                {snapshot ? (
                  <details className={styles.more}>
                    <summary>View CV{snapshot.name ? ` · ${snapshot.name}` : ""}</summary>
                    <div className={cvStyles.paper}>
                      <CvPreview cv={snapshot} />
                    </div>
                  </details>
                ) : (
                  <p className={styles.noCv}>No CV was attached to this application.</p>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState
          title="No applicants yet"
          text="Candidates who apply with their Daraja CV appear here. Share the job to reach more people."
          action={job.slug ? <Link className={dash.button} href={`/jobs/${job.slug}`}>View the job</Link> : null}
        />
      )}
    </>
  );
}
