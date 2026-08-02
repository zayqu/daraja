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
const EMPTY_FORM = { title: "", location: "", category: "", type: "FULL_TIME", description: "" };

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
        body: JSON.stringify(form),
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
