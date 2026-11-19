"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "@/components/dashboard/dashboard.module.css";

// Closes one of the employer's own vacancies (filled or no longer needed).
// The vacancy is archived, not deleted, and leaves the public site.
export default function WithdrawVacancyButton({ vacancyId, title }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function withdraw() {
    if (!window.confirm(`Close "${title}"? It will be removed from Daraja and can't be reopened.`)) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/employer/jobs/${vacancyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "withdraw" }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Unable to close this vacancy");
      router.refresh();
    } catch (problem) {
      setError(problem.message);
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" className={styles.buttonGhost} onClick={withdraw} disabled={busy}>
        {busy ? "Closing…" : "Close"}
      </button>
      {error ? <span className={styles.errorText} role="alert">{error}</span> : null}
    </>
  );
}
