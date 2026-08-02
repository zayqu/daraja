"use client";

import { useState } from "react";

export default function EmployerProfileForm() {
  const [form, setForm] = useState({ companyName: "", industry: "", website: "" });
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
      setMessage("Your employer profile was submitted for verification.");
      window.location.reload();
    } catch (error) {
      setStatus("error");
      setMessage(error.message || "Unable to save employer profile. Please try again.");
    }
  }

  return (
    <form className="portal-form" onSubmit={handleSubmit}>
      <div className="portal-field">
        <label htmlFor="company-name">Registered company name</label>
        <input id="company-name" autoComplete="organization" maxLength={160} required value={form.companyName} onChange={update("companyName")} />
      </div>
      <div className="portal-field">
        <label htmlFor="industry">Industry</label>
        <input id="industry" maxLength={160} value={form.industry} onChange={update("industry")} />
      </div>
      <div className="portal-field">
        <label htmlFor="company-website">Company website</label>
        <input id="company-website" type="url" inputMode="url" autoComplete="url" maxLength={500} placeholder="https://example.co.tz" value={form.website} onChange={update("website")} />
        <small>Use the official HTTPS website when one is available.</small>
      </div>
      {message && <p className={`portal-message ${status}`} role={status === "error" ? "alert" : "status"}>{message}</p>}
      <button className="portal-submit" type="submit" disabled={status === "loading"}>
        {status === "loading" ? "Submitting…" : "Submit for verification"}
      </button>
    </form>
  );
}
