"use client";

import { useState } from "react";
import styles from "./privacy.module.css";

const CONFIRMATION = "DELETE MY ACCOUNT";

export default function AccountDeletionForm() {
  const [email, setEmail] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const ready =
    email.trim().length > 0 &&
    confirmation === CONFIRMATION &&
    acknowledged &&
    !submitting;

  async function submit(event) {
    event.preventDefault();
    if (!ready) return;

    setSubmitting(true);
    setStatus("Deleting your Daraja account...");

    try {
      const response = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          confirmation,
          acknowledgeDataLoss: acknowledged,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setStatus(data.error || "Account deletion could not be completed.");
        setSubmitting(false);
        return;
      }

      if (data.fileCleanupPending) {
        setStatus(
          "Your account access has been removed. Private-file cleanup is still being finalized.",
        );
      } else {
        setStatus("Your Daraja account and eligible personal data were deleted.");
      }

      window.setTimeout(() => window.location.replace("/?accountDeleted=1"), 1200);
    } catch {
      setStatus("Account deletion could not be completed. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <form className={styles.deleteForm} onSubmit={submit}>
      <label className={styles.field}>
        <span>Email address on this account</span>
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          disabled={submitting}
        />
      </label>

      <label className={styles.field}>
        <span>
          Type <strong>{CONFIRMATION}</strong>
        </span>
        <input
          type="text"
          autoComplete="off"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          required
          disabled={submitting}
        />
      </label>

      <label className={styles.checkRow}>
        <input
          type="checkbox"
          checked={acknowledged}
          onChange={(event) => setAcknowledged(event.target.checked)}
          disabled={submitting}
        />
        <span>
          I understand that this permanently removes my Daraja account and
          eligible personal data and cannot be undone.
        </span>
      </label>

      <button className={styles.deleteButton} type="submit" disabled={!ready}>
        {submitting ? "Deleting account..." : "Delete my account permanently"}
      </button>

      <p className={styles.formStatus} role="status" aria-live="polite">
        {status}
      </p>
    </form>
  );
}
