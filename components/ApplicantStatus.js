"use client";

import { useState } from "react";
import styles from "./ApplicantStatus.module.css";

const OPTIONS = [
  ["PENDING", "New"],
  ["REVIEWED", "In review"],
  ["SHORTLISTED", "Shortlisted"],
  ["OFFERED", "Offer made"],
  ["REJECTED", "Not selected"],
];

// The employer moves an applicant along; the candidate sees the change in
// My jobs. A withdrawn application cannot be changed.
export default function ApplicantStatus({ applicationId, status }) {
  const [value, setValue] = useState(status);
  const [state, setState] = useState("idle");

  if (status === "WITHDRAWN") return <span className={styles.withdrawn}>Withdrawn by the candidate</span>;

  async function change(event) {
    const next = event.target.value;
    const previous = value;
    setValue(next);
    setState("saving");
    try {
      const response = await fetch(`/api/employer/applications/${encodeURIComponent(applicationId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!response.ok) throw new Error();
      setState("saved");
    } catch {
      setValue(previous);
      setState("error");
    }
  }

  return (
    <label className={styles.wrap}>
      <span className="sr-only">Application status</span>
      <select value={value} onChange={change} disabled={state === "saving"} className={styles.select}>
        {OPTIONS.map(([key, label]) => (
          <option key={key} value={key} disabled={key === "PENDING"}>{label}</option>
        ))}
      </select>
      {state === "saved" ? <small className={styles.saved}>Saved</small> : null}
      {state === "error" ? <small className={styles.error}>Not saved</small> : null}
    </label>
  );
}
