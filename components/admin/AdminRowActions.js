"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "./admin.module.css";

// Buttons that call an admin API, optionally after a confirmation or a typed
// reason, then refresh the server-rendered list.
//
// actions: [{ label, method, url, body, confirm, askReason, tone }]
export default function AdminRowActions({ actions }) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  async function run(action) {
    if (action.confirm && !window.confirm(action.confirm)) return;
    let body = action.body || {};
    if (action.askReason) {
      const reason = window.prompt(action.askReason);
      if (reason === null) return;
      if (!reason.trim()) {
        setError("A reason is required.");
        return;
      }
      body = { ...body, note: reason.trim(), reason: reason.trim() };
    }
    setBusy(action.label);
    setError("");
    try {
      const response = await fetch(action.url, {
        method: action.method || "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "That did not work. Please try again.");
      if (action.redirectTo) router.push(action.redirectTo);
      router.refresh();
    } catch (actionError) {
      setError(actionError.message);
    } finally {
      setBusy("");
    }
  }

  const toneClass = { danger: styles.buttonDanger, primary: styles.buttonPrimary };
  return (
    <div>
      <div className={styles.rowActions}>
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            className={toneClass[action.tone] || styles.button}
            disabled={Boolean(busy)}
            onClick={() => run(action)}
          >
            {busy === action.label ? "Working…" : action.label}
          </button>
        ))}
      </div>
      {error ? <p className={styles.help} role="alert" style={{ color: "#b42318" }}>{error}</p> : null}
    </div>
  );
}
