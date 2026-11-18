"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "./ApplicationWithdrawButton.module.css";

// The server API independently enforces application ownership and allowed status.
export default function ApplicationWithdrawButton({ applicationId }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [withdrawn, setWithdrawn] = useState(false);
  const [error, setError] = useState("");

  async function withdraw() {
    if (pending || withdrawn) return;
    if (!window.confirm("Withdraw this application? You cannot undo this action.")) return;

    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/candidate/applications/${encodeURIComponent(applicationId)}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "WITHDRAWN" }),
      });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        if (response.status === 401) {
          window.location.assign("/auth/signin?callbackUrl=/account/career");
          return;
        }
        throw new Error(result.error || "Application could not be withdrawn");
      }
      setWithdrawn(true);
      router.refresh();
    } catch (cause) {
      setError(cause.message || "Application could not be withdrawn. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={styles.action}>
      {withdrawn ? (
        <span className={styles.withdrawn} role="status">Withdrawn</span>
      ) : (
        <button type="button" disabled={pending} onClick={withdraw}>
          {pending ? "Withdrawing…" : "Withdraw application"}
        </button>
      )}
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
    </div>
  );
}
