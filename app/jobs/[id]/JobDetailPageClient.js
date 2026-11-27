"use client";

import { useState, useEffect, useCallback } from "react";
import formatJobTitle from "@/lib/job-title.cjs";
import Link from "next/link";
import { useParams } from "next/navigation";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import JobBrandMedia from "@/components/JobBrandMedia";
import SaveJobButton from "@/components/SaveJobButton";
import JobViewBeacon from "@/components/JobViewBeacon";
import NotFoundState from "@/components/ui/NotFoundState";
import { useT } from "@/components/LanguageProvider";
import { trackEvent } from "@/lib/analytics";
import { structureJobDescription } from "@/lib/job-description";
import { buildJobQuickGuide } from "@/lib/job-quick-guide";
import { SITE_ORIGIN, WHATSAPP_CHANNEL_URL } from "@/lib/site-config";
import styles from "./job-detail.module.css";

function experienceLabel({ experienceMinYears: min, experienceMaxYears: max }, t) {
  if (!Number.isInteger(min)) return null;
  if (min === 0 && (max === 0 || !Number.isInteger(max))) return t("No experience needed");
  if (!Number.isInteger(max)) return t(min === 1 ? "{n} year or more" : "{n} years or more", { n: min });
  if (max === min) return t(min === 1 ? "{n} year" : "{n} years", { n: min });
  return t("{min}–{max} years", { min, max });
}

function postedLabel(value, t) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const days = Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000));
  if (days === 0) return t("Posted today");
  if (days === 1) return t("Posted yesterday");
  return t("Posted {n} days ago", { n: days });
}

const FACT_ICONS = {
  salary: "M3 7h18v10H3zM12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
  type: "M4 8h16v11H4zM9 8V6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2",
  location: "M12 21s-6-5.3-6-10a6 6 0 1 1 12 0c0 4.7-6 10-6 10Zm0-7.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
  experience: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0",
  openings: "M16 20v-1a4 4 0 0 0-8 0v1M12 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  category: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  deadline: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13v4l3 2",
};

function Icon({ path, className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path d={path} />
    </svg>
  );
}

export default function JobDetailPageClient({ initialJob, showEmployerCta }) {
  const { id } = useParams();
  const t = useT();
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
      .replace(/^\w/, (letter) => letter.toUpperCase());
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
      `Position: ${formatJobTitle(job.title, job.source)}`,
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

  function pilotCampaignId() {
    // Only recognise Daraja-issued identifiers; never forward arbitrary URL text
    // or candidate data to analytics.
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    if (params.get("utm_source") !== "whatsapp" || params.get("utm_medium") !== "channel") {
      return null;
    }
    const campaign = params.get("utm_campaign") || "";
    return /^daraja_pilot_[a-z0-9_-]{4,40}$/.test(campaign) ? campaign : null;
  }

  function trackApplication() {
    const campaignId = pilotCampaignId();
    trackEvent("apply_job", {
      job_id: job.id,
      job_title: job.title,
      employer: job.company,
      category: job.category,
      application_method: applicationEmail ? "email" : "resolved_external",
      source: job.source,
      ...(campaignId ? { campaign_id: campaignId, distribution_channel: "whatsapp" } : {}),
    });
    if (applicationEmail) setEmailFallbackOpen(true);
  }

  const canApply = Boolean(job && (job.applicationUrl || job.sourceUrl) && !isExpired(job.deadline));
  const deadlineText = job?.deadline
    ? isExpired(job.deadline)
      ? t("Applications closed")
      : daysLeft(job.deadline) === 0
        ? t("Closes today")
        : t(daysLeft(job.deadline) === 1 ? "{n} day left" : "{n} days left", { n: daysLeft(job.deadline) })
    : null;
  const facts = job
    ? [
        job.salary ? { key: "salary", label: t("Salary"), value: job.salary } : null,
        { key: "type", label: t("Job type"), value: t(formatJobType(job.type)) },
        { key: "location", label: t("Location"), value: job.location },
        experienceLabel(job, t) ? { key: "experience", label: t("Experience"), value: experienceLabel(job, t) } : null,
        job.openings > 1 ? { key: "openings", label: t("Openings"), value: String(job.openings) } : null,
        { key: "category", label: t("Category"), value: t(job.category) },
      ].filter(Boolean)
    : [];

  function renderApplyAction() {
    return canApply ? (
      <a
        href={applicationHref}
        target={applicationEmail ? undefined : "_blank"}
        rel={applicationEmail ? undefined : "noopener noreferrer"}
        className={styles.primaryAction}
        onClick={trackApplication}
      >
        {t("Apply now")}
      </a>
    ) : (
      <span className={styles.closedAction}>{t("Applications closed")}</span>
    );
  }

  return (
    <div className={styles.page}>
      <SiteNav showEmployerCta={showEmployerCta} />
      <JobViewBeacon jobId={job.id} />

      <nav className={styles.breadcrumb} aria-label={t("Breadcrumb")}>
        <div className={styles.breadcrumbInner}>
          <Link href="/">{t("Home")}</Link>
          <span aria-hidden="true">/</span>
          <Link href="/jobs">{t("Jobs")}</Link>
          {job && (
            <>
              <span aria-hidden="true">/</span>
              <Link href={`/jobs?category=${encodeURIComponent(job.category)}`}>{t(job.category)}</Link>
            </>
          )}
          <span aria-hidden="true">/</span>
          <span>{loading ? t("Loading...") : job ? formatJobTitle(job.title, job.source) : t("Not found")}</span>
        </div>
      </nav>

      {loading && (
        <main className={styles.state} id="main-content">
          <p>{t("Loading position...")}</p>
        </main>
      )}

      {!loading && notFound && (
        <NotFoundState
          as="main"
          title={t("Page not found")}
          text={t("This job may have closed or the link is wrong.")}
          actionLabel={t("Go to jobs")}
        />
      )}

      {!loading && loadError && !notFound && (
        <main className={styles.state} id="main-content">
          <strong>{t("We could not load this position")}</strong>
          <p>{t("The connection was interrupted. Please try again.")}</p>
          <button type="button" className={styles.primaryAction} onClick={fetchJob}>
            {t("Try again")}
          </button>
        </main>
      )}

      {!loading && job && (
        <main className={styles.layout} id="main-content">
          <section className={`${styles.card} ${styles.summaryCard}`} aria-labelledby="job-title">
            <div className={styles.summaryTop}>
              <JobBrandMedia
                company={job.company}
                companyLogo={job.companyLogo}
                representativeImage={job.representativeImage}
                className={styles.companyMark}
                sizes="64px"
              />

              <div className={styles.summaryMain}>
                <div className={styles.titleRow}>
                  <h1 id="job-title">{formatJobTitle(job.title, job.source)}</h1>
                  {job.featured && <span className={styles.featured}>{t("Featured")}</span>}
                </div>
                <p className={styles.company}>{job.company}</p>
                <ul className={styles.summaryMeta} aria-label={t("Job summary")}>
                  <li><Icon path={FACT_ICONS.location} className={styles.metaIcon} />{job.location}</li>
                  <li><Icon path={FACT_ICONS.type} className={styles.metaIcon} />{t(formatJobType(job.type))}</li>
                  {postedLabel(job.createdAt, t) && (
                    <li><Icon path={FACT_ICONS.deadline} className={styles.metaIcon} />{postedLabel(job.createdAt, t)}</li>
                  )}
                </ul>
              </div>

              {deadlineText && (
                <span className={`${styles.summaryDeadline} ${getDeadlineClass(job.deadline)}`}>
                  {deadlineText}
                </span>
              )}
            </div>

            <div className={styles.summaryActions}>
              {renderApplyAction()}
              <SaveJobButton jobId={job.id} className={styles.secondaryAction} savedLabel={t("Saved")} />
              <a
                className={styles.iconAction}
                href={`https://wa.me/?text=${encodeURIComponent(getShareMessage())}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t("Share on WhatsApp")}
                title={t("Share on WhatsApp")}
              >
                <Icon path="M18 8a3 3 0 1 0-2.8-4M6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm12 6a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM8.6 13.5l6.8 4M15.4 6.5l-6.8 4" className={styles.actionIcon} />
              </a>
            </div>
          </section>

          <aside className={styles.sidebar} aria-label={t("Opportunity overview")}>
            <section className={`${styles.card} ${styles.factsCard}`}>
              <h2 className="sr-only">{t("Job details")}</h2>
              <dl className={styles.factsList}>
                {facts.map((fact) => (
                  <div key={fact.key}>
                    <span className={styles.factIcon}><Icon path={FACT_ICONS[fact.key]} /></span>
                    <dt>{fact.label}</dt>
                    <dd>{fact.value}</dd>
                  </div>
                ))}
                {job.deadline && (
                  <div>
                    <span className={styles.factIcon}><Icon path={FACT_ICONS.deadline} /></span>
                    <dt>{t("Deadline")}</dt>
                    <dd className={getDeadlineClass(job.deadline)}>
                      {formatDate(job.deadline)}{deadlineText && !isExpired(job.deadline) ? ` · ${deadlineText}` : ""}
                    </dd>
                  </div>
                )}
              </dl>
            </section>

            <section className={`${styles.card} ${styles.employerCard}`} aria-labelledby="employer-title">
              <div className={styles.employerHead}>
                <JobBrandMedia
                  company={job.company}
                  companyLogo={job.companyLogo}
                  representativeImage={job.representativeImage}
                  className={styles.employerMark}
                  sizes="40px"
                />
                <div>
                  <h2 id="employer-title">{job.company}</h2>
                  <p>{t(job.category)} · {job.location}</p>
                </div>
              </div>
              <div className={styles.browseLinks}>
                <Link href={`/jobs?category=${encodeURIComponent(job.category)}`}>
                  {t("More {category} jobs", { category: t(job.category) })}
                </Link>
                <Link href="/jobs">{t("All jobs")}</Link>
              </div>
            </section>
          </aside>

          <article className={`${styles.card} ${styles.contentCard}`} aria-labelledby="description-title">
            <h2 id="description-title" className="sr-only">{t("Position description")}</h2>
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

            <section className={styles.applyBox} aria-labelledby="apply-title">
              <h3 id="apply-title">{t("Apply for this role")}</h3>

              {job.source === "ajira" && (
                <p className={styles.helpText}>
                  {t("Continue to the official Ajira sign-in or application step for this vacancy.")}
                </p>
              )}

              {applicationEmail && (
                <>
                  <p className={styles.helpText}>
                    {t("Email:")} <a href={job.applicationUrl}>{applicationEmail}</a>
                    {applicationSubject && (
                      <>
                        <br />
                        {t("Subject:")} {applicationSubject}
                      </>
                    )}
                  </p>
                  {emailFallbackOpen && (
                    <div className={styles.emailFallback} role="status">
                      <strong>{t("Email app did not open?")}</strong>
                      <span>
                        {t("Copy the verified recipient and subject, then send your application from your preferred email app.")}
                      </span>
                      <button type="button" onClick={copyEmailApplicationDetails}>
                        {t(copyStatus || "Copy email details")}
                      </button>
                    </div>
                  )}
                </>
              )}

              <div className={styles.applyActions}>
                {renderApplyAction()}
                <Link
                  href={`/account/career/cv?job=${encodeURIComponent(job.id)}`}
                  className={styles.cvAction}
                >
                  {t("Tailor CV for this job")}
                </Link>
              </div>

              <p className={styles.trustNote}>
                {t("Daraja never charges job seekers fees to view or apply for jobs.")}
              </p>
            </section>

            {(() => {
              const guide = buildJobQuickGuide(job);
              return (
                <section className={styles.quickGuide} aria-labelledby="quick-guide-title">
                  <h3 id="quick-guide-title">{t("Before you apply")}</h3>
                  <p className={styles.quickGuideLead}>{t("Daraja tips for this vacancy")}</p>
                  <h4>{t("Who this role suits")}</h4>
                  <ul>
                    {guide.fit.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  <h4>{t("How to apply")}</h4>
                  <ol>
                    {guide.steps.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ol>
                  <h4>{t("Helpful guides")}</h4>
                  <ul className={styles.quickGuideLinks}>
                    {guide.links.map((link) => (
                      <li key={link.href}>
                        <Link href={link.href}>{link.label}</Link>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })()}
          </article>

        </main>
      )}

      <SiteFooter />
    </div>
  );
}
