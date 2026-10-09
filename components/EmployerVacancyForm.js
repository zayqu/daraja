"use client";

import { useState } from "react";
import Link from "next/link";
import { JOB_CATEGORIES } from "@/lib/job-categories";

const JOB_TYPES = [
  ["FULL_TIME", "Full time"],
  ["PART_TIME", "Part time"],
  ["CONTRACT", "Contract"],
  ["INTERNSHIP", "Internship"],
  ["FREELANCE", "Freelance"],
];
const EMPTY_FORM = {
  title: "",
  location: "",
  category: "",
  type: "FULL_TIME",
  description: "",
  deadline: "",
  applyMethod: "email",
  applyEmail: "",
  applyUrl: "",
};

function todayInTanzania() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Dar_es_Salaam" }).format(new Date());
}

// Only the chosen application method is sent, so the server never receives
// both an email and a link for one vacancy.
function submissionBody(form) {
  const { applyMethod, applyEmail, applyUrl, ...rest } = form;
  return applyMethod === "email"
    ? { ...rest, applyEmail: applyEmail.trim(), emailSubject: `Application for ${form.title.trim()}` }
    : { ...rest, applyUrl: applyUrl.trim() };
}

export default function EmployerVacancyForm({ companyName }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  function update(field) {
    return (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");
    try {
      const response = await fetch("/api/employer/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submissionBody(form)),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to submit vacancy");
      setForm(EMPTY_FORM);
      setStatus("success");
      setMessage("Vacancy submitted for review. You can follow its status in your employer workspace.");
    } catch (error) {
      setStatus("error");
      setMessage(error.message || "Unable to submit vacancy. Please try again.");
    }
  }

  return (
    <form className="portal-form" onSubmit={handleSubmit}>
      <div className="portal-field">
        <label htmlFor="vacancy-company">Employer</label>
        <input id="vacancy-company" value={companyName} readOnly aria-readonly="true" />
        <small>The authenticated employer name is applied automatically.</small>
      </div>
      <div className="portal-field">
        <label htmlFor="vacancy-title">Position title</label>
        <input id="vacancy-title" maxLength={160} required value={form.title} onChange={update("title")} />
      </div>
      <div className="portal-field">
        <label htmlFor="vacancy-location">Location</label>
        <input id="vacancy-location" maxLength={160} required value={form.location} onChange={update("location")} />
      </div>
      <div className="portal-field">
        <label htmlFor="vacancy-category">Professional category</label>
        <select id="vacancy-category" required value={form.category} onChange={update("category")}>
          <option value="">Select a category</option>
          {JOB_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
        </select>
      </div>
      <div className="portal-field">
        <label htmlFor="vacancy-type">Employment type</label>
        <select id="vacancy-type" value={form.type} onChange={update("type")}>
          {JOB_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>
      <div className="portal-field">
        <label htmlFor="vacancy-deadline">Closing date</label>
        <input id="vacancy-deadline" type="date" required min={todayInTanzania()} value={form.deadline} onChange={update("deadline")} />
        <small>Applications close at the end of this day (Tanzania time).</small>
      </div>
      <fieldset className="portal-field">
        <legend>How candidates apply</legend>
        <label>
          <input type="radio" name="vacancy-apply-method" value="email" checked={form.applyMethod === "email"} onChange={update("applyMethod")} />
          {" "}By email
        </label>
        <label>
          <input type="radio" name="vacancy-apply-method" value="link" checked={form.applyMethod === "link"} onChange={update("applyMethod")} />
          {" "}On our website
        </label>
      </fieldset>
      {form.applyMethod === "email" ? (
        <div className="portal-field">
          <label htmlFor="vacancy-apply-email">Application email</label>
          <input id="vacancy-apply-email" type="email" maxLength={200} required value={form.applyEmail} onChange={update("applyEmail")} placeholder="careers@company.co.tz" />
          <small>The Apply button opens an email to this address.</small>
        </div>
      ) : (
        <div className="portal-field">
          <label htmlFor="vacancy-apply-url">Application page link</label>
          <input id="vacancy-apply-url" type="url" maxLength={2000} required pattern="https://.*" value={form.applyUrl} onChange={update("applyUrl")} placeholder="https://company.co.tz/careers/position" />
          <small>Must start with https://. The Apply button opens this page.</small>
        </div>
      )}
      <div className="portal-field portal-field-wide">
        <label htmlFor="vacancy-description">Position description</label>
        <textarea id="vacancy-description" maxLength={10000} minLength={80} required rows={12} value={form.description} onChange={update("description")} />
        <small>Include responsibilities, requirements and a clear application process.</small>
      </div>
      {message && <p className={`portal-message ${status}`} role={status === "error" ? "alert" : "status"}>{message}</p>}
      <div className="portal-actions">
        <button className="portal-submit" type="submit" disabled={status === "loading"}>
          {status === "loading" ? "Submitting…" : "Submit for review"}
        </button>
        <Link href="/employer">Back to employer workspace</Link>
      </div>
    </form>
  );
}
