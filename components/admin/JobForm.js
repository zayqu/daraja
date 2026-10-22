"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "./admin.module.css";

const TYPES = [
  ["", "Not stated"],
  ["FULL_TIME", "Full time"],
  ["PART_TIME", "Part time"],
  ["CONTRACT", "Contract"],
  ["INTERNSHIP", "Internship"],
  ["FREELANCE", "Freelance"],
];

export default function JobForm({ job = null, categories }) {
  const router = useRouter();
  const editing = Boolean(job?.id);
  const [values, setValues] = useState({
    title: job?.title || "",
    company: job?.company || "",
    location: job?.location || "",
    category: job?.category || "",
    type: job?.type || "",
    salary: job?.salary || "",
    deadline: job?.deadline || "",
    applyMethod: job?.applyEmail ? "email" : "link",
    applyEmail: job?.applyEmail || "",
    emailSubject: job?.emailSubject || "",
    applyUrl: job?.applyUrl || "",
    description: job?.description || "",
    publish: true,
  });
  const [state, setState] = useState("idle");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  const set = (key) => (event) =>
    setValues((current) => ({
      ...current,
      [key]: event.target.type === "checkbox" ? event.target.checked : event.target.value,
    }));

  async function submit(event) {
    event.preventDefault();
    setState("saving");
    setError("");
    setSaved("");
    const body = {
      ...values,
      applyEmail: values.applyMethod === "email" ? values.applyEmail : "",
      emailSubject: values.applyMethod === "email" ? values.emailSubject : "",
      applyUrl: values.applyMethod === "link" ? values.applyUrl : "",
    };
    try {
      const response = await fetch(editing ? `/api/admin/jobs/${job.id}` : "/api/admin/jobs", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "The job was not saved.");
      if (editing) {
        setSaved("Changes saved. They will not be overwritten by the next scrape.");
        router.refresh();
      } else {
        router.push(`/admin/jobs/${payload.job.id}?created=1`);
      }
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setState("idle");
    }
  }

  return (
    <form onSubmit={submit}>
      {error ? <p className={styles.alert} role="alert">{error}</p> : null}
      {saved ? <p className={styles.notice} role="status">{saved}</p> : null}
      <div className={styles.formGrid}>
        <div className={`${styles.field} ${styles.full}`}>
          <label htmlFor="job-title">Job title</label>
          <input id="job-title" className={styles.input} value={values.title} onChange={set("title")} maxLength={160} required />
        </div>
        <div className={styles.field}>
          <label htmlFor="job-company">Company</label>
          <input id="job-company" className={styles.input} value={values.company} onChange={set("company")} maxLength={160} required />
        </div>
        <div className={styles.field}>
          <label htmlFor="job-location">Location</label>
          <input id="job-location" className={styles.input} value={values.location} onChange={set("location")} placeholder="Dar es Salaam" maxLength={160} required />
        </div>
        <div className={styles.field}>
          <label htmlFor="job-category">Category</label>
          <select id="job-category" className={styles.select} value={values.category} onChange={set("category")} required>
            <option value="">Choose a category</option>
            {categories.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label htmlFor="job-type">Job type</label>
          <select id="job-type" className={styles.select} value={values.type} onChange={set("type")}>
            {TYPES.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label htmlFor="job-deadline">Closing date</label>
          <input id="job-deadline" className={styles.input} type="date" value={values.deadline} onChange={set("deadline")} />
          <p className={styles.help}>Applications close at the end of this day (Tanzania time). Leave empty if there is no deadline.</p>
        </div>
        <div className={styles.field}>
          <label htmlFor="job-salary">Salary (optional)</label>
          <input id="job-salary" className={styles.input} value={values.salary} onChange={set("salary")} placeholder="e.g. TZS 1,200,000 per month" maxLength={160} />
        </div>
        <div className={styles.field}>
          <label htmlFor="job-apply-method">How to apply</label>
          <select id="job-apply-method" className={styles.select} value={values.applyMethod} onChange={set("applyMethod")}>
            <option value="link">Application link (https)</option>
            <option value="email">By email</option>
          </select>
        </div>
        {values.applyMethod === "email" ? (
          <>
            <div className={styles.field}>
              <label htmlFor="job-apply-email">Application email</label>
              <input id="job-apply-email" className={styles.input} type="email" value={values.applyEmail} onChange={set("applyEmail")} required />
            </div>
            <div className={`${styles.field} ${styles.full}`}>
              <label htmlFor="job-email-subject">Email subject the employer asks for (optional)</label>
              <input id="job-email-subject" className={styles.input} value={values.emailSubject} onChange={set("emailSubject")} maxLength={200} />
            </div>
          </>
        ) : (
          <div className={styles.field}>
            <label htmlFor="job-apply-url">Application link</label>
            <input id="job-apply-url" className={styles.input} type="url" value={values.applyUrl} onChange={set("applyUrl")} placeholder="https://" required />
          </div>
        )}
        <div className={`${styles.field} ${styles.full}`}>
          <label htmlFor="job-description">Description</label>
          <textarea id="job-description" className={styles.textarea} value={values.description} onChange={set("description")} maxLength={20000} required />
          <p className={styles.help}>Put each heading and each requirement on its own line; Daraja formats it into sections.</p>
        </div>
        {!editing ? (
          <div className={`${styles.field} ${styles.full}`}>
            <label>
              <input type="checkbox" checked={values.publish} onChange={set("publish")} /> Publish immediately
            </label>
            <p className={styles.help}>Untick to save it in &quot;Needs review&quot; first.</p>
          </div>
        ) : null}
      </div>
      <div className={styles.formActions}>
        <button type="button" className={styles.button} onClick={() => router.push("/admin/jobs")}>Cancel</button>
        <button type="submit" className={styles.buttonPrimary} disabled={state === "saving"}>
          {state === "saving" ? "Saving…" : editing ? "Save changes" : values.publish ? "Publish job" : "Save for review"}
        </button>
      </div>
    </form>
  );
}
