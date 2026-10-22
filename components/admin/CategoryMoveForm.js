"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "./admin.module.css";

export default function CategoryMoveForm({ fromOptions, toOptions }) {
  const router = useRouter();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [state, setState] = useState("idle");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    if (!window.confirm(`Move every job in "${from}" to "${to}"?`)) return;
    setState("saving");
    setError("");
    setMessage("");
    const response = await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ from, to }),
    }).catch(() => null);
    const payload = await response?.json().catch(() => ({}));
    setState("idle");
    if (!response?.ok) {
      setError(payload?.error || "Jobs were not moved");
      return;
    }
    setMessage(`Moved ${payload.moved} job${payload.moved === 1 ? "" : "s"}.`);
    router.refresh();
  }

  return (
    <form onSubmit={submit}>
      {error ? <p className={styles.alert} role="alert">{error}</p> : null}
      {message ? <p className={styles.notice} role="status">{message}</p> : null}
      <div className={styles.filters}>
        <select className={styles.select} value={from} onChange={(event) => setFrom(event.target.value)} aria-label="Move jobs from" required>
          <option value="">Move all jobs from…</option>
          {fromOptions.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
        <select className={styles.select} value={to} onChange={(event) => setTo(event.target.value)} aria-label="Move jobs to" required>
          <option value="">…to</option>
          {toOptions.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
        <button className={styles.buttonPrimary} type="submit" disabled={state === "saving" || !from || !to}>
          {state === "saving" ? "Moving…" : "Move jobs"}
        </button>
      </div>
    </form>
  );
}
