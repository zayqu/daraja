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
  const days = daysUntil(value);
  if (days === null) return null;
  if (days < 0) return "Applications closed";
  if (days === 0) return "Closes today";
  if (days === 1) return "Closes tomorrow";
  if (days <= 7) return `Closes in ${days} days`;
  return `Closes ${formatDate(value)}`;
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
            {deadline}
          </span>
        )}
        {posted && <span className={styles.posted}>{posted}</span>}
      </div>
    </Link>
  );
}
