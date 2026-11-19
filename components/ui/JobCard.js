"use client";
import NavIcon from "@/components/ui/NavIcon";

import formatJobTitle from "@/lib/job-title.cjs";
import Link from "next/link";
import JobBrandMedia from "@/components/JobBrandMedia";
import { trackEvent } from "@/lib/analytics";
import styles from "./JobCard.module.css";
import { useT } from "@/components/LanguageProvider";

const JOB_TYPE_LABELS = {
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  CONTRACT: "Contract",
  INTERNSHIP: "Internship",
  FREELANCE: "Freelance",
};

function safeDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value) {
  const date = safeDate(value);
  if (!date) return null;

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
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

function formatDeadlineDate(value) {
  const date = safeDate(value);
  if (!date) return null;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function deadlineLabel(value, t) {
  const days = daysUntil(value);
  if (days === null) return null;
  if (days < 0) return t("Closed");
  if (days === 0) return t("Closes today");
  if (days === 1) return t("Closes tomorrow");
  if (days <= 7) return t("Closes in {n} days", { n: days });
  return t("Deadline: {date}", { date: formatDeadlineDate(value) });
}

function experienceLabel(min, max, t) {
  if (!Number.isInteger(min)) return null;
  if (min === 0 && max === 0) return t("No experience needed");
  if (!Number.isInteger(max)) return t(min === 1 ? "{n}+ yr exp" : "{n}+ yrs exp", { n: min });
  if (max === min) return t(min === 1 ? "{n} yr exp" : "{n} yrs exp", { n: min });
  return t("{min}–{max} yrs exp", { min, max });
}

// Only facts the source stated: missing values hide their chip instead of
// falling back to a guess.
function factTags(job, t) {
  return [
    experienceLabel(job.experienceMinYears, job.experienceMaxYears, t),
    JOB_TYPE_LABELS[job.type] ? t(JOB_TYPE_LABELS[job.type]) : null,
    job.openings > 1 ? t("{n} openings", { n: job.openings }) : null,
    job.salary ? job.salary : null,
  ].filter(Boolean);
}

function deadlineTone(value) {
  const days = daysUntil(value);
  if (days === null) return "";
  if (days < 0) return styles.expired;
  if (days <= 3) return styles.soon;
  return "";
}

function postedLabel(value, t) {
  const date = safeDate(value);
  if (!date) return null;

  const days = Math.max(0, Math.floor((new Date() - date) / 86400000));
  if (days === 0) return t("Posted today");
  if (days === 1) return t("Posted yesterday");
  if (days < 7) return t("Posted {n} days ago", { n: days });
  return t("Posted {date}", { date: formatDate(value) });
}

export default function JobCard({
  job,
  listName = "Job opportunities",
}) {
  const t = useT();
  const deadline = deadlineLabel(job.deadline, t);
  const posted = postedLabel(job.createdAt, t);
  const tags = factTags(job, t);
  const displayTitle = formatJobTitle(job.title, job.source);

  return (
    <Link
      href={`/jobs/${job.slug || job.id}`}
      className={styles.card}
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
        sizes="52px"
      />

      <span className={styles.saveVisual} aria-hidden="true">
        <NavIcon name="bookmark" size={20} />
      </span>

      <div className={styles.content}>
        <div className={styles.titleRow}>
          <h3 className={styles.title} title={displayTitle}>{displayTitle}</h3>
          {job.featured && <span className={styles.featured}>{t("Featured")}</span>}
        </div>

        <p className={styles.company}>{job.company}</p>
        {job.location && <p className={styles.location}>{job.location}</p>}

        {tags.length > 0 && (
          <div className={styles.tags} aria-label={t("Job attributes")}>
            {tags.map((tag) => (
              <span key={tag} className={styles.tag}>
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className={styles.side}>
        {deadline && (
          <span className={`${styles.deadline} ${deadlineTone(job.deadline)}`}>
            <span>{deadline}</span>
            <span className={styles.calendarIcon}><NavIcon name="schedule" size={14} /></span>
          </span>
        )}
        {posted && (
          <span className={deadline ? styles.posted : styles.deadline}>
            {posted}
          </span>
        )}
      </div>
    </Link>
  );
}
