"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import JobBrandMedia from "@/components/JobBrandMedia";
import { trackEvent } from "@/lib/analytics";
import { structureJobDescription } from "@/lib/job-description";
import { SITE_ORIGIN, WHATSAPP_CHANNEL_URL } from "@/lib/site-config";
import styles from "./job-detail.module.css";

function experienceLabel({ experienceMinYears: min, experienceMaxYears: max }) {
  if (!Number.isInteger(min)) return null;
  if (min === 0 && max === 0) return "No experience needed";
  const years = (count) => `${count} year${count === 1 ? "" : "s"}`;
  if (!Number.isInteger(max)) return `${years(min)} or more`;
  if (max === min) return years(min);
  return `${min}–${max} years`;
}

export default function JobDetailPageClient({ initialJob, showEmployerCta }) {
  const { id } = useParams();
  const [job, setJob] = useState(initialJob || null);
  const [loading, setLoading] = useState(!initialJob);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [emailFallbackOpen, setEmailFallbackOpen] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");

  const fetchJob = useCallback(async function fetchJob() {
    setLoading(true);
    setNotFound(false);
    setLoadError(false);

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const res = await fetch("/api/jobs/" + encodeURIComponent(id), {
          cache: "no-store",
        });

        if (res.status === 404) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        if (!res.ok) {
          throw new Error(`Job detail request failed with status ${res.status}`);
        }

        const data = await res.json();
        if (!data?.job) throw new Error("Job detail response was empty");

        setJob(data.job);
        setLoading(false);
        trackEvent("view_item", {
          items: [{
            item_id: data.job.id,
            item_name: data.job.title,
            item_brand: data.job.company,
            item_category: data.job.category,
          }],
        });
        return;
      } catch (error) {
        console.error(error);
        if (attempt < 3) {
          await new Promise((resolve) => setTimeout(resolve, attempt * 400));
          continue;
        }
      }
    }

    setLoadError(true);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    if (initialJob || !id) return;
    void fetchJob();
  }, [id, initialJob, fetchJob]);

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
      `View details: ${SITE_ORIGIN}/jobs/${encodeURIComponent(job.slug || job.id)}`,
      "",
      "Follow Daraja Jobs on WhatsApp:",
      WHATSAPP_CHANNEL_URL,
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

  async function copyEmailApplicationDetails() {
    if (!applicationEmail) return;
    const value = [
      `Email: ${applicationEmail}`,
      applicationSubject ? `Subject: ${applicationSubject}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    try {
      await navigator.clipboard.writeText(value);
      setCopyStatus("Copied");
    } catch {
      setCopyStatus("Copy unavailable");
    }
  }

  function trackApplication() {
    trackEvent("apply_job", {
      job_id: job.id,
      job_title: job.title,
      employer: job.company,
      category: job.category,
      application_method: applicationEmail ? "email" : "resolved_external",
      source: job.source,
    });
    if (applicationEmail) setEmailFallbackOpen(true);
  }

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

      {!loading && loadError && !notFound && (
        <main className={styles.state} id="main-content">
          <strong>We could not load this position</strong>
          <p>The connection was interrupted. Please try again.</p>
          <button type="button" className={styles.primaryAction} onClick={fetchJob}>
            Try again
          </button>
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
                    onClick={trackApplication}
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
                  <dt>Position</dt>
                  <dd>{job.title}</dd>
                </div>
                <div>
                  <dt>Company / Institution</dt>
                  <dd>{job.company}</dd>
                </div>
                <div>
                  <dt>Location</dt>
                  <dd>{job.location}</dd>
                </div>
                <div>
                  <dt>Category</dt>
                  <dd>{job.category}</dd>
                </div>
                <div>
                  <dt>Job type</dt>
                  <dd>{formatJobType(job.type)}</dd>
                </div>
                {experienceLabel(job) && (
                  <div>
                    <dt>Experience</dt>
                    <dd>{experienceLabel(job)}</dd>
                  </div>
                )}
                {job.openings > 1 && (
                  <div>
                    <dt>Openings</dt>
                    <dd>{job.openings}</dd>
                  </div>
                )}
                {job.deadline && (
                  <div>
                    <dt>Deadline</dt>
                    <dd className={getDeadlineClass(job.deadline)}>
                      {formatDate(job.deadline)}
                    </dd>
                  </div>
                )}
              </dl>
            </aside>

            <article className={`${styles.card} ${styles.contentCard}`}>
              <div className={styles.cardEyebrow}>About the role</div>
              <h2>Position description</h2>
              <div className={styles.description}>
                {structureJobDescription(job.description, { company: job.company }).map((section) => (
                  <section key={section.id} className={styles.descriptionSection}>
                    <h3>{section.title}</h3>
                    {section.paragraphs.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                    {section.items.length > 0 && (
                      <ul>
                        {section.items.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    )}
                  </section>
                ))}
              </div>

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
                  onClick={trackApplication}
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
                <>
                  <p className={styles.helpText}>
                    Email: <a href={job.applicationUrl}>{applicationEmail}</a>
                    {applicationSubject && (
                      <>
                        <br />
                        Subject: {applicationSubject}
                      </>
                    )}
                  </p>
                  {emailFallbackOpen && (
                    <div className={styles.emailFallback} role="status">
                      <strong>Email app did not open?</strong>
                      <span>
                        Copy the verified recipient and subject, then send your
                        application from your preferred email app.
                      </span>
                      <button type="button" onClick={copyEmailApplicationDetails}>
                        {copyStatus || "Copy email details"}
                      </button>
                    </div>
                  )}
                </>
              )}

              <Link
                href={`/account/career/cv?job=${encodeURIComponent(job.id)}`}
                className={styles.cvAction}
              >
                Tailor CV for this job
              </Link>

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
