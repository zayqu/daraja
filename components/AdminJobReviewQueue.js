"use client";

import { useState } from "react";
import styles from "./AdminJobReviewQueue.module.css";

function formatDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function ReviewItem({ job, onDone }) {
  const [reason, setReason] = useState("");
  const [state, setState] = useState("idle");
  const [error, setError] = useState("");
  const deadline = formatDate(job.deadline);

  async function decide(status) {
    setState("saving");
    setError("");
    try {
      const response = await fetch(`/api/admin/jobs/${job.id}/moderate`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, note: status === "REJECTED" ? reason : "" }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Decision was not saved");
      onDone(job.id);
    } catch (decisionError) {
      setError(decisionError.message);
      setState("idle");
    }
  }

  return (
    <li className={styles.item}>
      <div className={styles.heading}>
        <h3>{job.title}</h3>
        <p>
          {job.company}
          {job.location ? `, ${job.location}` : ""}
        </p>
      </div>

      {job.moderationNote && <p className={styles.reason}>{job.moderationNote}</p>}

      <dl className={styles.facts}>
        <div>
          <dt>Source</dt>
          <dd>{job.source}</dd>
        </div>
        <div>
          <dt>Deadline</dt>
          <dd>{deadline || "Not stated"}</dd>
        </div>
      </dl>

      {job.description && <p className={styles.excerpt}>{job.description.slice(0, 280)}</p>}

      {job.sourceUrl && (
        <a className={styles.original} href={job.sourceUrl} target="_blank" rel="noopener noreferrer nofollow">
          Open original vacancy
        </a>
      )}

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.publish}
          disabled={state === "saving"}
          onClick={() => decide("PUBLISHED")}
        >
          Publish
        </button>
        <input
          type="text"
          value={reason}
          maxLength={300}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Reason to reject"
          aria-label={`Reason to reject ${job.title}`}
        />
        <button
          type="button"
          className={styles.reject}
          disabled={state === "saving" || !reason.trim()}
          onClick={() => decide("REJECTED")}
        >
          Reject
        </button>
      </div>
      {error && <p className={styles.error} role="alert">{error}</p>}
    </li>
  );
}

export default function AdminJobReviewQueue({ jobs }) {
  const [items, setItems] = useState(jobs);

  if (!items.length) {
    return <p className={styles.empty}>No vacancies are waiting for review.</p>;
  }

  return (
    <ul className={styles.list}>
      {items.map((job) => (
        <ReviewItem
          key={job.id}
          job={job}
          onDone={(id) => setItems((current) => current.filter((item) => item.id !== id))}
        />
      ))}
    </ul>
  );
}
