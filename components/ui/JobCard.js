"use client";

import Link from "next/link";
import JobBrandMedia from "@/components/JobBrandMedia";
import { trackEvent } from "@/lib/analytics";
import styles from "./JobCard.module.css";

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

function daysUntil(value) {
  const date = safeDate(value);
  if (!date) return null;
  return Math.ceil((date - new Date()) / 86400000);
}

function deadlineLabel(value) {
  const formatted = formatDate(value);
  return formatted ? `Deadline: ${formatted}` : null;
}

function deadlineTone(value) {
  const days = daysUntil(value);
  if (days === null) return "";
  if (days < 0) return styles.expired;
  if (days <= 3) return styles.soon;
  return "";
}

function postedLabel(value) {
  const date = safeDate(value);
  if (!date) return null;

  const days = Math.max(0, Math.floor((new Date() - date) / 86400000));
  if (days === 0) return "Posted today";
  if (days === 1) return "Posted yesterday";
  if (days < 7) return `Posted ${days} days ago`;
  return `Posted ${formatDate(value)}`;
}

export default function JobCard({
  job,
  listName = "Job opportunities",
}) {
  const deadline = deadlineLabel(job.deadline);
  const posted = postedLabel(job.createdAt);

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
        <svg viewBox="0 0 24 24" focusable="false">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z" />
        </svg>
      </span>

      <div className={styles.content}>
        <div className={styles.titleRow}>
          <h3 className={styles.title}>{job.title}</h3>
          {job.featured && <span className={styles.featured}>Featured</span>}
        </div>

        <p className={styles.company}>{job.company}</p>
        {job.location && <p className={styles.location}>{job.location}</p>}

        <div className={styles.tags} aria-label="Job attributes">
          <span className={styles.tag}>
            {JOB_TYPE_LABELS[job.type] || job.type || "Job"}
          </span>
          {job.category && (
            <span className={`${styles.tag} ${styles.category}`}>
              {job.category}
            </span>
          )}
        </div>
      </div>

      <div className={styles.side}>
        {deadline && (
          <span className={`${styles.deadline} ${deadlineTone(job.deadline)}`}>
            <span>{deadline}</span>
            <svg className={styles.calendarIcon} viewBox="0 0 24 24" focusable="false" aria-hidden="true">
              <path d="M7 3v3M17 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />
            </svg>
          </span>
        )}
        {posted && <span className={styles.posted}>{posted}</span>}
      </div>
    </Link>
  );
}
