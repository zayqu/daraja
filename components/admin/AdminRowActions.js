"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "./admin.module.css";

// Buttons that call an admin API, optionally after a confirmation or a typed
// reason, then refresh the server-rendered list.
//
// actions: [{ label, method, url, body, confirm, askReason, tone }]
export default function AdminRowActions({ actions, links = [] }) {
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
  // One visible button (the primary action, if any) and the rest in a menu,
  // so rows stay readable on phones. `links` are extra menu entries (Edit, View).
  const primary = actions.find((action) => action.tone === "primary");
  const rest = actions.filter((action) => action !== primary);
  return (
    <div>
      <div className={styles.rowActions}>
        {primary ? (
          <button
            type="button"
            className={toneClass.primary}
            disabled={Boolean(busy)}
            onClick={() => run(primary)}
          >
            {busy === primary.label ? "Working…" : primary.label}
          </button>
        ) : null}
        {rest.length || links.length ? (
          <details className={styles.menu}>
            <summary className={styles.menuButton} aria-label="More actions">⋯</summary>
            <div className={styles.menuList}>
              {links.map((link) => (
                <a key={link.href} href={link.href} target={link.external ? "_blank" : undefined} rel={link.external ? "noreferrer" : undefined}>
                  {link.label}
                </a>
              ))}
              {rest.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  className={action.tone === "danger" ? styles.menuDanger : undefined}
                  disabled={Boolean(busy)}
                  onClick={(event) => {
                    event.currentTarget.closest("details")?.removeAttribute("open");
                    run(action);
                  }}
                >
                  {busy === action.label ? "Working…" : action.label}
                </button>
              ))}
            </div>
          </details>
        ) : null}
      </div>
      {error ? <p className={styles.errorText} role="alert">{error}</p> : null}
    </div>
  );
}

// Bulk bar for a list whose rows carry <input type="checkbox" name="ids"
// form={formId}>. Applies one moderation status to every ticked row.
export function BulkActions({ formId, url, actions }) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

  function selectedIds() {
    return [...document.querySelectorAll(`input[name="ids"][form="${formId}"]:checked`)].map((input) => input.value);
  }

  async function run(action) {
    const ids = selectedIds();
    if (!ids.length) {
      setMessage("Tick the jobs first.");
      return;
    }
    let note = "";
    if (action.askReason) {
      note = window.prompt(`${action.askReason} (${ids.length} selected)`) || "";
      if (!note.trim()) return;
    } else if (!window.confirm(`${action.label} ${ids.length} job${ids.length === 1 ? "" : "s"}?`)) {
      return;
    }
    setBusy(action.label);
    setMessage("");
    try {
      const response = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, status: action.status, note }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "That did not work.");
      setMessage(`Updated ${payload.updated}${payload.skipped ? `, skipped ${payload.skipped} (employer not verified)` : ""}.`);
      router.refresh();
    } catch (actionError) {
      setMessage(actionError.message);
    } finally {
      setBusy("");
    }
  }

  return (
    <div className={styles.bulkBar}>
      <label className={styles.bulkAll}>
        <input
          type="checkbox"
          onChange={(event) => {
            for (const input of document.querySelectorAll(`input[name="ids"][form="${formId}"]`)) {
              input.checked = event.target.checked;
            }
          }}
        />{" "}
        Select all on this page
      </label>
      {actions.map((action) => (
        <button
          key={action.label}
          type="button"
          className={action.tone === "primary" ? styles.buttonPrimary : styles.button}
          disabled={Boolean(busy)}
          onClick={() => run(action)}
        >
          {busy === action.label ? "Working…" : action.label}
        </button>
      ))}
      {message ? <span className={styles.subtle} role="status">{message}</span> : null}
    </div>
  );
}
