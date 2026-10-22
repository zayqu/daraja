"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "./admin.module.css";

async function send(method, body) {
  try {
    const response = await fetch("/api/admin/categories", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({}));
    return { ok: response.ok, payload };
  } catch {
    return { ok: false, payload: { error: "Network problem. Please try again." } };
  }
}

export function CategoryCreateForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [keywords, setKeywords] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const { ok, payload } = await send("POST", { action: "create", name, keywords });
    setBusy(false);
    if (!ok) {
      setError(payload.error || "Not saved");
      return;
    }
    setName("");
    setKeywords("");
    router.refresh();
  }

  return (
    <form onSubmit={submit}>
      {error ? <p className={styles.alert} role="alert">{error}</p> : null}
      <div className={styles.formGrid}>
        <div className={styles.field}>
          <label htmlFor="new-category-name">Category name</label>
          <input id="new-category-name" className={styles.input} value={name} onChange={(event) => setName(event.target.value)} required maxLength={100} />
        </div>
        <div className={styles.field}>
          <label htmlFor="new-category-keywords">Keywords that sort jobs into it</label>
          <input id="new-category-keywords" className={styles.input} value={keywords} onChange={(event) => setKeywords(event.target.value)} placeholder="e.g. pilot, cabin crew, aviation" />
        </div>
      </div>
      <div className={styles.formActions}>
        <button type="submit" className={styles.buttonPrimary} disabled={busy}>{busy ? "Adding…" : "Add category"}</button>
      </div>
    </form>
  );
}

// One row of the category list: rename, keywords, show/hide, order, delete.
export function CategoryRow({ category, others, first, last }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(category.name);
  const [keywords, setKeywords] = useState(category.keywords.join(", "));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save(changes) {
    setBusy(true);
    setError("");
    const { ok, payload } = await send("PATCH", { id: category.id, ...changes });
    setBusy(false);
    if (!ok) {
      setError(payload.error || "Not saved");
      return false;
    }
    router.refresh();
    return true;
  }

  async function remove() {
    const target = window.prompt(
      `Delete "${category.name}"? Type the category its ${category.total} job(s) should move to, or leave empty for the fallback category.\n\nOptions: ${others.join(", ")}`,
      ""
    );
    if (target === null) return;
    setBusy(true);
    const { ok, payload } = await send("DELETE", { id: category.id, moveTo: target.trim() || undefined });
    setBusy(false);
    if (!ok) setError(payload.error || "Not deleted");
    else router.refresh();
  }

  return (
    <li className={styles.categoryRow}>
      <div className={styles.categoryMain}>
        <strong>{category.name}</strong>
        <span className={styles.subtle}>
          {category.live} live · {category.total} total
          {category.isFallback ? " · catches unsorted jobs" : ""}
          {category.active ? "" : " · hidden"}
        </span>
        {category.keywords.length && !editing ? (
          <span className={styles.subtle}>Keywords: {category.keywords.join(", ")}</span>
        ) : null}
      </div>
      <div className={styles.rowActions}>
        <button type="button" className={styles.buttonGhost} disabled={busy || first} onClick={() => save({ move: "up" })} aria-label={`Move ${category.name} up`}>↑</button>
        <button type="button" className={styles.buttonGhost} disabled={busy || last} onClick={() => save({ move: "down" })} aria-label={`Move ${category.name} down`}>↓</button>
        <button type="button" className={styles.button} onClick={() => setEditing(!editing)}>{editing ? "Close" : "Edit"}</button>
        {!category.isFallback ? (
          <>
            <button type="button" className={styles.button} disabled={busy} onClick={() => save({ active: !category.active })}>
              {category.active ? "Hide" : "Show"}
            </button>
            <button type="button" className={styles.buttonDanger} disabled={busy} onClick={remove}>Delete</button>
          </>
        ) : null}
      </div>
      {editing ? (
        <form
          className={styles.inlineForm}
          onSubmit={async (event) => {
            event.preventDefault();
            if (await save({ name, keywords })) setEditing(false);
          }}
        >
          <div className={styles.formGrid}>
            <div className={styles.field}>
              <label htmlFor={`cat-name-${category.id}`}>Name</label>
              <input id={`cat-name-${category.id}`} className={styles.input} value={name} onChange={(event) => setName(event.target.value)} maxLength={100} required />
              <p className={styles.help}>Renaming updates its jobs and job alerts. The page address stays the same.</p>
            </div>
            <div className={styles.field}>
              <label htmlFor={`cat-keywords-${category.id}`}>Extra keywords</label>
              <input id={`cat-keywords-${category.id}`} className={styles.input} value={keywords} onChange={(event) => setKeywords(event.target.value)} placeholder="comma separated" />
              <p className={styles.help}>New jobs whose title mentions these go into this category.</p>
            </div>
          </div>
          <div className={styles.formActions}>
            <button type="submit" className={styles.buttonPrimary} disabled={busy}>{busy ? "Saving…" : "Save"}</button>
          </div>
        </form>
      ) : null}
      {error ? <p className={styles.errorText} role="alert">{error}</p> : null}
    </li>
  );
}

export function CategoryMoveForm({ fromOptions, toOptions }) {
  const router = useRouter();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    if (!window.confirm(`Move every job in "${from}" to "${to}"?`)) return;
    setBusy(true);
    setError("");
    setMessage("");
    const { ok, payload } = await send("POST", { action: "move", from, to });
    setBusy(false);
    if (!ok) {
      setError(payload.error || "Jobs were not moved");
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
        <button className={styles.buttonPrimary} type="submit" disabled={busy || !from || !to}>
          {busy ? "Moving…" : "Move jobs"}
        </button>
      </div>
    </form>
  );
}
