"use client";

import formatJobTitle from "@/lib/job-title.cjs";
import Link from "next/link";
import JobBrandMedia from "@/components/JobBrandMedia";
import { trackEvent } from "@/lib/analytics";
import { useT } from "@/components/LanguageProvider";
import styles from "./JobCard.module.css";

const JOB_TYPE_LABELS = {
  FULL_TIME: "Full time",
  PART_TIME: "Part time",
  CONTRACT: "Contract",
  INTERNSHIP: "Internship",
  FREELANCE: "Freelance",
};

function safeDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

const DAY_MS = 86400000;
const EAST_AFRICA_OFFSET_MS = 3 * 60 * 60 * 1000;

// Deadlines are stored as the stated calendar day (end of day, UTC), so compare
// that day with today's date in East Africa rather than raw hours remaining.
function daysUntil(value) {
  const date = safeDate(value);
  if (!date) return null;
  const deadlineDay = Math.floor(date.getTime() / DAY_MS);
  const today = Math.floor((Date.now() + EAST_AFRICA_OFFSET_MS) / DAY_MS);
  return deadlineDay - today;
}

function deadlineLabel(value, t) {
  const days = daysUntil(value);
  if (days === null) return null;
  if (days < 0) return t("Closed");
  if (days === 0) return t("Closes today");
  return t(days === 1 ? "{n} day left" : "{n} days left", { n: days });
}

function deadlineTone(value) {
  const days = daysUntil(value);
  if (days === null) return "";
  if (days < 0) return styles.expired;
  if (days <= 4) return styles.soon;
  return "";
}

function experienceLabel(min, max, t) {
  if (!Number.isInteger(min)) return null;
  if (min === 0 && (max === 0 || !Number.isInteger(max))) return t("No experience needed");
  if (!Number.isInteger(max)) return t("{n}+ YoE", { n: min });
  if (max === min) return t("{n} YoE", { n: min });
  return t("{min}–{max} YoE", { min, max });
}

function postedLabel(value, t) {
  const date = safeDate(value);
  if (!date) return null;

  const days = Math.max(0, Math.floor((Date.now() - date.getTime()) / DAY_MS));
  if (days === 0) return t("Today");
  if (days === 1) return t("Yesterday");
  if (days < 30) return t("{n} days ago", { n: days });
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

const ICONS = {
  location: "M12 21s-6-5.3-6-10a6 6 0 1 1 12 0c0 4.7-6 10-6 10Zm0-7.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
  type: "M4 8h16v11H4zM9 8V6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2",
  experience: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0",
  salary: "M3 7h18v10H3zM12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM6 10v.01M18 14v.01",
  openings: "M16 20v-1a4 4 0 0 0-8 0v1M12 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM20 20v-1a3 3 0 0 0-2.2-2.9M17 5.2a3 3 0 0 1 0 5.6",
  posted: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13v4l3 2",
};

function MetaIcon({ name }) {
  return (
    <svg className={styles.metaIcon} viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path d={ICONS[name]} />
    </svg>
  );
}

// Only facts the source stated: missing values hide their item instead of
// falling back to a guess.
function factItems(job, t) {
  const experience = experienceLabel(job.experienceMinYears, job.experienceMaxYears, t);
  return [
    job.location ? { key: "location", label: job.location } : null,
    JOB_TYPE_LABELS[job.type] ? { key: "type", label: t(JOB_TYPE_LABELS[job.type]) } : null,
    experience ? { key: "experience", label: experience } : null,
    job.salary ? { key: "salary", label: job.salary } : null,
    job.openings > 1 ? { key: "openings", label: t("{n} openings", { n: job.openings }) } : null,
  ].filter(Boolean);
}

/**
 * Shared public job card.
 * - variant "row" (default): full-width list row used by search results and
 *   homepage lists.
 * - variant "tile": compact card used in homepage card rails/grids.
 */
export default function JobCard({
  job,
  listName = "Job opportunities",
  variant = "row",
}) {
  const t = useT();
  const deadline = deadlineLabel(job.deadline, t);
  const posted = postedLabel(job.createdAt, t);
  const facts = factItems(job, t);
  const displayTitle = formatJobTitle(job.title, job.source);
  const isTile = variant === "tile";
  const visibleFacts = isTile
    ? facts.filter((fact) => fact.key === "location" || fact.key === "type")
    : facts;
  const tileSalary = isTile ? job.salary : null;

  return (
    <Link
      href={`/jobs/${job.slug || job.id}`}
      className={`${styles.card} ${isTile ? styles.tile : styles.row}`}
      onClick={() =>
        trackEvent("select_item", {
          item_list_name: listName,
          items: [{
            item_id: job.id,
            item_name: job.title,
            item_brand: job.company,
            item_category: job.category,
          }],
        })
      }
    >
      <JobBrandMedia
        company={job.company}
        companyLogo={job.companyLogo}
        representativeImage={job.representativeImage}
        className={styles.brand}
        sizes="44px"
      />

      <div className={styles.content}>
        <div className={styles.titleRow}>
          <h3 className={styles.title} title={displayTitle}>{displayTitle}</h3>
          {job.featured && <span className={styles.featured}>{t("Featured")}</span>}
        </div>

        <p className={styles.company}>{job.company}</p>

        {(visibleFacts.length > 0 || (!isTile && posted)) && (
          <ul className={styles.meta} aria-label={t("Job facts")}>
            {visibleFacts.map((fact) => (
              <li key={fact.key} className={styles[`meta_${fact.key}`]}>
                <MetaIcon name={fact.key} />
                <span>{fact.label}</span>
              </li>
            ))}
            {!isTile && posted && (
              <li className={styles.posted}>
                <MetaIcon name="posted" />
                <span>{posted}</span>
              </li>
            )}
          </ul>
        )}
      </div>

      <span className={styles.saveVisual} aria-hidden="true">
        <svg viewBox="0 0 24 24" focusable="false">
          <path d="M6 4h12v16l-6-4-6 4V4Z" />
        </svg>
      </span>

      {(deadline || tileSalary) && (
        <div className={styles.side}>
          {isTile && (
            <span className={tileSalary ? styles.salary : styles.salaryMissing}>
              {tileSalary || t("Salary not stated")}
            </span>
          )}
          {deadline && (
            <span className={`${styles.deadline} ${deadlineTone(job.deadline)}`}>
              {deadline}
            </span>
          )}
        </div>
      )}
    </Link>
  );
}
