"use client";

import { useState } from "react";

// Sends the company details for verification. `initial` pre-fills the form
// when an employer corrects details that Daraja asked them to change.
export default function EmployerProfileForm({ initial = {}, submitLabel = "Submit for verification" }) {
  const [form, setForm] = useState({
    companyName: initial.companyName || "",
    industry: initial.industry || "",
    website: initial.website || "",
  });
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
      const response = await fetch("/api/employer/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to save employer profile");
      setStatus("success");
      setMessage("Thank you. Your company details were sent to Daraja for verification.");
      window.location.reload();
    } catch (error) {
      setStatus("error");
      setMessage(error.message || "Unable to save employer profile. Please try again.");
    }
  }

  return (
    <form className="portal-form" onSubmit={handleSubmit}>
      <div className="portal-field portal-field-wide">
        <label htmlFor="company-name">Registered company name</label>
        <input id="company-name" autoComplete="organization" maxLength={160} required value={form.companyName} onChange={update("companyName")} />
      </div>
      <div className="portal-field">
        <label htmlFor="industry">Industry <span>(optional)</span></label>
        <input id="industry" maxLength={160} placeholder="e.g. Banking, Logistics, NGO" value={form.industry} onChange={update("industry")} />
      </div>
      <div className="portal-field">
        <label htmlFor="company-website">Company website <span>(optional)</span></label>
        <input id="company-website" type="url" inputMode="url" autoComplete="url" maxLength={500} placeholder="https://example.co.tz" value={form.website} onChange={update("website")} />
        <small>Your official website, starting with https://</small>
      </div>
      {message && <p className={`portal-message ${status}`} role={status === "error" ? "alert" : "status"}>{message}</p>}
      <div className="portal-actions">
        <button className="portal-submit" type="submit" disabled={status === "loading"}>
          {status === "loading" ? "Sending…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
