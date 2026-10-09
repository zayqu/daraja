"use client";

import { useState } from "react";
import styles from "./AdminJobReviewQueue.module.css";

function EmployerItem({ employer, onDone }) {
  const [note, setNote] = useState("");
  const [state, setState] = useState("idle");
  const [error, setError] = useState("");

  async function decide(status) {
    setState("saving");
    setError("");
    try {
      const response = await fetch(`/api/admin/employers/${employer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, note: status === "VERIFIED" ? "" : note }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Decision was not saved");
      onDone(employer.id);
    } catch (decisionError) {
      setError(decisionError.message);
      setState("idle");
    }
  }

  return (
    <li className={styles.item}>
      <div className={styles.heading}>
        <h3>{employer.companyName}</h3>
        <p>{employer.email}</p>
      </div>

      <dl className={styles.facts}>
        <div>
          <dt>Industry</dt>
          <dd>{employer.industry || "Not stated"}</dd>
        </div>
        <div>
          <dt>Vacancies waiting</dt>
          <dd>{employer.pendingJobs}</dd>
        </div>
      </dl>

      {employer.website && (
        <a className={styles.original} href={employer.website} target="_blank" rel="noopener noreferrer nofollow">
          Open company website
        </a>
      )}

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.publish}
          disabled={state === "saving"}
          onClick={() => decide("VERIFIED")}
        >
          Verify employer
        </button>
        <input
          type="text"
          value={note}
          maxLength={300}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Reason to reject"
          aria-label={`Reason to reject ${employer.companyName}`}
        />
        <button
          type="button"
          className={styles.reject}
          disabled={state === "saving" || !note.trim()}
          onClick={() => decide("REJECTED")}
        >
          Reject
        </button>
      </div>
      {error && <p className={styles.error} role="alert">{error}</p>}
    </li>
  );
}

export default function AdminEmployerQueue({ employers }) {
  const [items, setItems] = useState(employers);

  if (!items.length) {
    return <p className={styles.empty}>No employers are waiting for verification.</p>;
  }

  return (
    <ul className={styles.list}>
      {items.map((employer) => (
        <EmployerItem
          key={employer.id}
          employer={employer}
          onDone={(id) => setItems((current) => current.filter((item) => item.id !== id))}
        />
      ))}
    </ul>
  );
}
