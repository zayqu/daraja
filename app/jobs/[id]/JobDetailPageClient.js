"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import JobBrandMedia from "@/components/JobBrandMedia";
import { trackEvent } from "@/lib/analytics";
import styles from "./job-detail.module.css";

export default function JobDetailPageClient({ showEmployerCta }) {
  const { id } = useParams();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const fetchJob = useCallback(async function fetchJob() {
    try {
      const res = await fetch("/api/jobs/" + id);
      if (res.status === 404) {
        setNotFound(true);
        return;
      }

      const data = await res.json();
      setJob(data.job);
      trackEvent("view_item", {
        items: [{
          item_id: data.job.id,
          item_name: data.job.title,
          item_brand: data.job.company,
          item_category: data.job.category,
        }],
      });
    } catch (error) {
      console.error(error);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) queueMicrotask(fetchJob);
  }, [id, fetchJob]);

  function formatDate(value) {
    if (!value) return null;
    return new Date(value).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  function formatJobType(value) {
    if (!value) return "Not specified";
    return value
      .replaceAll("_", " ")
      .toLowerCase()
      .replace(/\b\w/g, (letter) => letter.toUpperCase())
      .replace("Full Time", "Full-time")
      .replace("Part Time", "Part-time");
  }

  function formatSource(value) {
    if (!value) return "Verified source";
    if (value === "daraja") return "Daraja";
    return value
      .replaceAll("-", " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function isExpired(value) {
    return value && new Date(value) < new Date();
  }

  function isExpiringSoon(value) {
    if (!value) return false;
    const days = (new Date(value) - new Date()) / 86400000;
    return days <= 7 && days > 0;
  }

  function daysLeft(value) {
    if (!value) return null;
    return Math.ceil((new Date(value) - new Date()) / 86400000);
  }

  function getDeadlineClass(value) {
    if (isExpired(value)) return styles.deadlineExpired;
    if (isExpiringSoon(value)) return styles.deadlineSoon;
    return styles.deadlineOpen;
  }

  function getShareMessage() {
    const deadline = job.deadline ? formatDate(job.deadline) : "Not specified";

    return [
      "📢 New Job Opportunity",
      "",
      `Position: ${job.title}`,
      `Organisation: ${job.company}`,
      `Location: ${job.location}`,
      `Category: ${job.category}`,
      `Deadline: ${deadline}`,
      "",
      `View details: ${window.location.href}`,
      "",
      "Follow Daraja Jobs on WhatsApp:",
      "https://whatsapp.com/channel/0029Vanw1OQ1CYoYdxl32g3V",
    ].join("\n");
  }

  function getApplicationEmail() {
    if (!job?.applicationUrl?.startsWith("mailto:")) return "";

    try {
      return decodeURIComponent(
        job.applicationUrl.slice("mailto:".length).split("?")[0]
      );
    } catch {
      return "";
    }
  }

  const applicationEmail = getApplicationEmail();
  const applicationSubject = applicationEmail
    ? new URL(job.applicationUrl).searchParams.get("subject") || ""
    : "";
  const applicationHref = applicationEmail
    ? job.applicationUrl
    : job
      ? `/api/jobs/${encodeURIComponent(job.slug || job.id)}/apply`
      : "#";

  return (
    <div className={styles.page}>
      <SiteNav
        showSearch
        showEmployerCta={showEmployerCta}
      />

      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <div className={styles.breadcrumbInner}>
          <Link href="/">Home</Link>
          <span aria-hidden="true">›</span>
          <Link href="/jobs">Jobs</Link>
          <span aria-hidden="true">›</span>
          <span>{loading ? "Loading..." : job ? job.title : "Not found"}</span>
        </div>
      </nav>

      {loading && (
        <main className={styles.state} id="main-content">
          <p>Loading position...</p>
        </main>
      )}

      {!loading && notFound && (
        <main className={styles.state} id="main-content">
          <strong>Position not found</strong>
          <p>This job may have been removed, closed or replaced.</p>
          <Link href="/jobs">Browse all jobs →</Link>
        </main>
      )}

      {!loading && job && (
        <>
          <section className={styles.summary}>
            <div className={styles.summaryInner}>
              <JobBrandMedia
                company={job.company}
                companyLogo={job.companyLogo}
                representativeImage={job.representativeImage}
                className={styles.companyMark}
                sizes="64px"
              />

              <div className={styles.summaryMain}>
                <p className={styles.company}>{job.company}</p>
                <h1>{job.title}</h1>

                <div className={styles.summaryMeta}>
                  <span>{job.location}</span>
                  <span>{formatJobType(job.type)}</span>
                  <span>{job.category}</span>
                </div>
              </div>

              <div className={styles.summaryActions}>
                {job.deadline && (
                  <div className={`${styles.summaryDeadline} ${getDeadlineClass(job.deadline)}`}>
                    {isExpired(job.deadline)
                      ? "Applications closed"
                      : daysLeft(job.deadline) === 0
                        ? "Closes today"
                        : `${daysLeft(job.deadline)} day${daysLeft(job.deadline) === 1 ? "" : "s"} left`}
                  </div>
                )}

                {(job.applicationUrl || job.sourceUrl) && !isExpired(job.deadline) ? (
                  <a
                    href={applicationHref}
                    target={applicationEmail ? undefined : "_blank"}
                    rel={applicationEmail ? undefined : "noopener noreferrer"}
                    className={styles.primaryAction}
                    onClick={() =>
                      trackEvent("apply_job", {
                        job_id: job.id,
                        job_title: job.title,
                        employer: job.company,
                        category: job.category,
                        application_method: applicationEmail
                          ? "email"
                          : "resolved_external",
                        source: job.source,
                      })
                    }
                  >
                    Apply now →
                  </a>
                ) : (
                  <span className={styles.closedAction}>Applications closed</span>
                )}
              </div>
            </div>
          </section>

          <main className={styles.layout} id="main-content">
            <aside className={`${styles.card} ${styles.detailsCard}`}>
              <div className={styles.cardEyebrow}>Opportunity overview</div>
              <h2>Job details</h2>

              <dl className={styles.detailsList}>
                <div>
                  <dt>Organisation</dt>
                  <dd>{job.company}</dd>
                </div>
                <div>
                  <dt>Location</dt>
                  <dd>{job.location}</dd>
                </div>
                <div>
                  <dt>Job type</dt>
                  <dd>{formatJobType(job.type)}</dd>
                </div>
                <div>
                  <dt>Category</dt>
                  <dd>{job.category}</dd>
                </div>
                {job.deadline && (
                  <div>
                    <dt>Closing date</dt>
                    <dd className={getDeadlineClass(job.deadline)}>
                      {formatDate(job.deadline)}
                    </dd>
                  </div>
                )}
                <div>
                  <dt>Posted</dt>
                  <dd>{formatDate(job.createdAt)}</dd>
                </div>
                <div>
                  <dt>Source</dt>
                  <dd>
                    {job.sourceUrl ? (
                      <a
                        href={job.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.sourceLink}
                      >
                        {formatSource(job.source)}
                      </a>
                    ) : (
                      formatSource(job.source)
                    )}
                  </dd>
                </div>
              </dl>
            </aside>

            <article className={`${styles.card} ${styles.contentCard}`}>
              <div className={styles.cardEyebrow}>About the role</div>
              <h2>Position description</h2>
              <div className={styles.description}>{job.description}</div>

              {job.salary && (
                <section className={styles.salarySection}>
                  <h3>Salary</h3>
                  <p>{job.salary}</p>
                </section>
              )}
            </article>

            <section className={`${styles.card} ${styles.applicationCard}`}>
              <div className={styles.cardEyebrow}>Next step</div>
              <h2>Apply for this role</h2>

              {(job.applicationUrl || job.sourceUrl) && !isExpired(job.deadline) ? (
                <a
                  href={applicationHref}
                  target={applicationEmail ? undefined : "_blank"}
                  rel={applicationEmail ? undefined : "noopener noreferrer"}
                  className={styles.primaryAction}
                  onClick={() =>
                    trackEvent("apply_job", {
                      job_id: job.id,
                      job_title: job.title,
                      employer: job.company,
                      category: job.category,
                      application_method: applicationEmail
                        ? "email"
                        : "resolved_external",
                      source: job.source,
                    })
                  }
                >
                  Apply now →
                </a>
              ) : (
                <span className={styles.closedAction}>Applications closed</span>
              )}

              {job.source === "ajira" && (
                <p className={styles.helpText}>
                  Continue to the official Ajira sign-in or application step
                  for this vacancy.
                </p>
              )}

              {applicationEmail && (
                <p className={styles.helpText}>
                  Email: <a href={job.applicationUrl}>{applicationEmail}</a>
                  {applicationSubject && (
                    <>
                      <br />
                      Subject: {applicationSubject}
                    </>
                  )}
                </p>
              )}

              <p className={styles.trustNote}>
                Daraja never charges job seekers fees to view or apply for jobs.
              </p>

              <a
                className={styles.shareAction}
                href={`https://wa.me/?text=${encodeURIComponent(getShareMessage())}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Share on WhatsApp
              </a>
            </section>

            <section className={`${styles.card} ${styles.browseCard}`}>
              <div className={styles.cardEyebrow}>Keep exploring</div>
              <h2>Similar opportunities</h2>
              <p>
                Browse more current vacancies in the same category or return to
                the complete jobs list.
              </p>
              <div className={styles.browseLinks}>
                <Link href={`/jobs?category=${encodeURIComponent(job.category)}`}>
                  More {job.category} jobs →
                </Link>
                <Link href="/jobs">All jobs →</Link>
              </div>
            </section>
          </main>
        </>
      )}

      <SiteFooter />
    </div>
  );
}
