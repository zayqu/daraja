"use client";

import { useState } from "react";
import Link from "next/link";
import { JOB_CATEGORIES } from "@/lib/job-categories";

const JOB_TYPES = [
  ["", "Not stated"],
  ["FULL_TIME", "Full time"],
  ["PART_TIME", "Part time"],
  ["CONTRACT", "Contract"],
  ["INTERNSHIP", "Internship"],
  ["FREELANCE", "Freelance"],
];

const EMPTY_FORM = {
  title: "",
  company: "",
  location: "",
  category: "",
  type: "",
  salary: "",
  deadline: "",
  applyTo: "",
  emailSubject: "",
  description: "",
  visible: true,
};

// One form for posting a new vacancy and for editing any existing one,
// including vacancies collected by the scrapers.
export default function AdminJobForm({ jobId = null, initial = null, sourceNote = "" }) {
  const [form, setForm] = useState({ ...EMPTY_FORM, ...(initial || {}) });
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [savedSlug, setSavedSlug] = useState("");

  function update(field) {
    return (event) => {
      const value = event.target.type === "checkbox" ? event.target.checked : event.target.value;
      setForm((current) => ({ ...current, [field]: value }));
    };
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");
    try {
      const response = await fetch(jobId ? `/api/admin/jobs/${jobId}` : "/api/admin/jobs", {
        method: jobId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "The vacancy was not saved");
      setSavedSlug(payload.job?.slug || "");
      setStatus("success");
      if (!jobId) setForm(EMPTY_FORM);
      setMessage(jobId ? "Changes saved. They show on the website within a minute." : "Vacancy posted. It shows on the website within a minute.");
    } catch (error) {
      setStatus("error");
      setMessage(error.message || "The vacancy was not saved. Please try again.");
    }
  }

  return (
    <form className="portal-form" onSubmit={handleSubmit}>
      {sourceNote && <p className="portal-message">{sourceNote}</p>}
      <div className="portal-field">
        <label htmlFor="admin-job-title">Position title</label>
        <input id="admin-job-title" maxLength={160} required value={form.title} onChange={update("title")} />
      </div>
      <div className="portal-field">
        <label htmlFor="admin-job-company">Employer</label>
        <input id="admin-job-company" maxLength={160} required value={form.company} onChange={update("company")} />
      </div>
      <div className="portal-field">
        <label htmlFor="admin-job-location">Location</label>
        <input id="admin-job-location" maxLength={160} required value={form.location} onChange={update("location")} />
      </div>
      <div className="portal-field">
        <label htmlFor="admin-job-category">Category</label>
        <select id="admin-job-category" required value={form.category} onChange={update("category")}>
          <option value="">Select a category</option>
          {JOB_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
        </select>
      </div>
      <div className="portal-field">
        <label htmlFor="admin-job-type">Job type</label>
        <select id="admin-job-type" value={form.type} onChange={update("type")}>
          {JOB_TYPES.map(([value, label]) => <option key={value || "none"} value={value}>{label}</option>)}
        </select>
      </div>
      <div className="portal-field">
        <label htmlFor="admin-job-deadline">Deadline</label>
        <input id="admin-job-deadline" type="date" value={form.deadline} onChange={update("deadline")} />
        <small>Leave empty if the advert has no deadline. Closes at 23:59 Tanzania time.</small>
      </div>
      <div className="portal-field">
        <label htmlFor="admin-job-salary">Salary (optional)</label>
        <input id="admin-job-salary" maxLength={160} value={form.salary} onChange={update("salary")} />
      </div>
      <div className="portal-field">
        <label htmlFor="admin-job-apply">How to apply</label>
        <input id="admin-job-apply" maxLength={2000} required placeholder="jobs@company.co.tz or https://…" value={form.applyTo} onChange={update("applyTo")} />
        <small>An email address or the employer&apos;s application link.</small>
      </div>
      <div className="portal-field">
        <label htmlFor="admin-job-subject">Email subject (optional)</label>
        <input id="admin-job-subject" maxLength={200} value={form.emailSubject} onChange={update("emailSubject")} />
        <small>Only used when applying by email.</small>
      </div>
      <div className="portal-field portal-field-wide">
        <label htmlFor="admin-job-description">Description</label>
        <textarea id="admin-job-description" maxLength={10000} minLength={80} required rows={16} value={form.description} onChange={update("description")} />
        <small>Put headings such as &quot;Key responsibilities&quot; or &quot;Requirements&quot; on their own line and start list items with &quot;- &quot;.</small>
      </div>
      <div className="portal-field portal-field-wide">
        <label htmlFor="admin-job-visible">
          <input id="admin-job-visible" type="checkbox" checked={form.visible} onChange={update("visible")} />{" "}
          Show this vacancy on the website
        </label>
      </div>
      {message && (
        <p className={`portal-message ${status}`} role={status === "error" ? "alert" : "status"}>
          {message}{" "}
          {status === "success" && savedSlug && <Link href={`/jobs/${savedSlug}`}>View the job →</Link>}
        </p>
      )}
      <div className="portal-actions">
        <button className="portal-submit" type="submit" disabled={status === "loading"}>
          {status === "loading" ? "Saving…" : jobId ? "Save changes" : "Post vacancy"}
        </button>
        <Link href="/admin/jobs">Back to vacancies</Link>
      </div>
    </form>
  );
}
