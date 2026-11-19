"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "@/components/dashboard/dashboard.module.css";

// Lets a candidate withdraw a Daraja-managed application that is still being
// considered (the API only allows "Sent" and "In review" applications).
export default function WithdrawApplicationButton({ applicationId, title }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function withdraw() {
    if (!window.confirm(`Withdraw your application for "${title}"?`)) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/candidate/applications/${applicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "WITHDRAWN" }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Unable to withdraw this application");
      router.refresh();
    } catch (problem) {
      setError(problem.message);
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" className={styles.buttonGhost} onClick={withdraw} disabled={busy}>
        {busy ? "Withdrawing…" : "Withdraw"}
      </button>
      {error ? <span className={styles.errorText} role="alert">{error}</span> : null}
    </>
  );
}
