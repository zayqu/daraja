"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "./admin.module.css";

async function send(url, method, body) {
  try {
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body || {}),
    });
    const payload = await response.json().catch(() => ({}));
    return { ok: response.ok, payload };
  } catch {
    return { ok: false, payload: { error: "Network problem. Please try again." } };
  }
}

// On/off switch used for "collect jobs" and "publish automatically".
export function SourceSwitch({ id, name, field, value, confirmOff, disabled = false }) {
  const router = useRouter();
  const [on, setOn] = useState(value);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function toggle() {
    const next = !on;
    if (!next && confirmOff && !window.confirm(confirmOff)) return;
    setBusy(true);
    setError("");
    const { ok, payload } = await send(`/api/admin/sources/${id}`, "PATCH", { [field]: next });
    setBusy(false);
    if (!ok) {
      setError(payload.error || "Not saved");
      return;
    }
    setOn(next);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={`${field === "enabled" ? "Collect jobs from" : "Publish automatically from"} ${name}`}
        className={`${styles.toggle} ${on ? styles.toggleOn : ""}`}
        disabled={busy || disabled}
        onClick={toggle}
      />
      {error ? <span className={styles.errorText} role="alert">{error}</span> : null}
    </>
  );
}

const EMPTY = {
  name: "",
  url: "",
  listingPages: "",
  allowedHosts: "",
  detailPathPattern: "",
  titleSelector: "",
  descriptionSelector: "",
  recruiterName: "",
  countryFilter: "Tanzania",
  maxJobs: 50,
};

// Add or edit a configurable job website (recruiter / careers page).
export function SourceForm({ source = null, onDone }) {
  const router = useRouter();
  const editing = Boolean(source?.id);
  const [values, setValues] = useState(
    source
      ? {
          name: source.name || "",
          url: source.url || "",
          listingPages: (source.discovery?.listingPages || []).join("\n"),
          allowedHosts: (source.discovery?.allowedHosts || []).join(", "),
          detailPathPattern: source.discovery?.detailPathPattern || "",
          titleSelector: source.detail?.titleSelector || "",
          descriptionSelector: source.detail?.descriptionSelector || "",
          recruiterName: source.recruiterName || "",
          countryFilter: source.countryFilter || "Tanzania",
          maxJobs: source.discovery?.maxJobs || 50,
        }
      : EMPTY
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (key) => (event) => setValues((current) => ({ ...current, [key]: event.target.value }));

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const { ok, payload } = editing
      ? await send(`/api/admin/sources/${source.id}`, "PATCH", { source: values })
      : await send("/api/admin/sources", "POST", values);
    setBusy(false);
    if (!ok) {
      setError(payload.error || "The source was not saved.");
      return;
    }
    if (!editing) setValues(EMPTY);
    onDone?.();
    router.refresh();
  }

  const field = (key, label, props = {}, help = "") => (
    <div className={`${styles.field} ${props.full ? styles.full : ""}`}>
      <label htmlFor={`source-${key}-${source?.id || "new"}`}>{label}</label>
      {props.multiline ? (
        <textarea
          id={`source-${key}-${source?.id || "new"}`}
          className={`${styles.textarea} ${styles.textareaSmall}`}
          value={values[key]}
          onChange={set(key)}
          placeholder={props.placeholder}
        />
      ) : (
        <input
          id={`source-${key}-${source?.id || "new"}`}
          className={styles.input}
          value={values[key]}
          onChange={set(key)}
          placeholder={props.placeholder}
          type={props.type || "text"}
          required={props.required}
        />
      )}
      {help ? <p className={styles.help}>{help}</p> : null}
    </div>
  );

  return (
    <form onSubmit={submit}>
      {error ? <p className={styles.alert} role="alert">{error}</p> : null}
      <div className={styles.formGrid}>
        {field("name", "Name", { required: true, placeholder: "e.g. Acme Recruitment" })}
        {field("url", "Website jobs page", { required: true, type: "url", placeholder: "https://" })}
        {field("listingPages", "Pages that list the jobs", { multiline: true, full: true, placeholder: "https://example.co.tz/jobs?page=1\nhttps://example.co.tz/jobs?page=2" }, "One address per line. Leave empty to use the jobs page above.")}
        {field("allowedHosts", "Websites jobs may link to", { placeholder: "example.co.tz" }, "Comma separated. Defaults to the jobs page's website.")}
        {field("detailPathPattern", "Job link pattern", { placeholder: "^/jobs/" }, "Only links whose path matches are treated as job ads.")}
        {field("titleSelector", "Job title selector (optional)", { placeholder: "h1" })}
        {field("descriptionSelector", "Description selector (optional)", { placeholder: ".job-description" })}
        {field("recruiterName", "Recruiter name", { placeholder: "Shown as the source of the ad" })}
        {field("countryFilter", "Only keep jobs in")}
        {field("maxJobs", "Maximum jobs per run", { type: "number" })}
      </div>
      <div className={styles.formActions}>
        {onDone ? <button type="button" className={styles.button} onClick={onDone}>Cancel</button> : null}
        <button type="submit" className={styles.buttonPrimary} disabled={busy}>
          {busy ? "Saving…" : editing ? "Save source" : "Add source"}
        </button>
      </div>
    </form>
  );
}

// Test / Edit / Delete for one configurable source.
export function SourceActions({ source }) {
  const router = useRouter();
  const [mode, setMode] = useState("");
  const [busy, setBusy] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  async function test() {
    setBusy("test");
    setError("");
    setResult(null);
    setMode("test");
    const { ok, payload } = await send(`/api/admin/sources/${source.id}`, "POST", {});
    setBusy("");
    if (!ok) setError(payload.error || "The test failed");
    else setResult(payload);
  }

  async function remove() {
    if (!window.confirm(`Remove ${source.name}? Daraja stops collecting from it. Jobs already on the site stay until they close.`)) return;
    setBusy("delete");
    const { ok, payload } = await send(`/api/admin/sources/${source.id}`, "DELETE", {});
    setBusy("");
    if (!ok) setError(payload.error || "Not removed");
    else router.refresh();
  }

  return (
    <div>
      <div className={styles.rowActions}>
        {source.configurable ? (
          <>
            <button type="button" className={styles.button} disabled={Boolean(busy)} onClick={test}>
              {busy === "test" ? "Testing…" : "Test"}
            </button>
            <button type="button" className={styles.button} onClick={() => setMode(mode === "edit" ? "" : "edit")}>
              Edit
            </button>
          </>
        ) : null}
        <button type="button" className={styles.buttonDanger} disabled={Boolean(busy)} onClick={remove}>
          Remove
        </button>
      </div>
      {error ? <p className={styles.errorText} role="alert">{error}</p> : null}
      {mode === "test" && result ? (
        <div className={styles.testResult}>
          <strong>
            Found {result.found} job{result.found === 1 ? "" : "s"}
            {result.health?.discovered ? ` (${result.health.discovered} links checked)` : ""}
          </strong>
          {result.sample.length ? (
            <ul>
              {result.sample.map((job, index) => (
                <li key={index}>
                  {job.title} — {job.company}
                  {job.deadline ? `, closes ${new Date(job.deadline).toLocaleDateString("en-GB")}` : ""}
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.help}>Nothing found. Check the listing pages and the job link pattern.</p>
          )}
          <p className={styles.help}>Nothing was saved. Switch the source on when the results look right.</p>
        </div>
      ) : null}
      {mode === "edit" ? (
        <div className={styles.inlineForm}>
          <SourceForm source={source} onDone={() => setMode("")} />
        </div>
      ) : null}
    </div>
  );
}
