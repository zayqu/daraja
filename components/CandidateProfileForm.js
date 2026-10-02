"use client";

import { useState } from "react";
import { candidateProfileFormValue } from "@/lib/candidate-profile";
import styles from "./CandidateProfileForm.module.css";

export default function CandidateProfileForm({ initialProfile }) {
  const [form, setForm] = useState(candidateProfileFormValue(initialProfile));
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  function update(field) {
    return (event) =>
      setForm((current) => ({ ...current, [field]: event.target.value }));
  }

  async function save(event) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch("/api/candidate/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Your profile could not be saved.");
      }

      setForm(candidateProfileFormValue(payload.profile));
      setStatus("success");
      setMessage("Profile saved.");
    } catch (error) {
      setStatus("error");
      setMessage(error.message || "Your profile could not be saved.");
    }
  }

  const messageClassName = [styles.message, styles[status]]
    .filter(Boolean)
    .join(" ");

  return (
    <form className={styles.form} onSubmit={save}>
      <div className={styles.grid}>
        <label className={styles.field}>
          <span>Full name</span>
          <input
            autoComplete="name"
            maxLength={160}
            required
            value={form.fullName}
            onChange={update("fullName")}
          />
        </label>

        <label className={styles.field}>
          <span>Phone</span>
          <input
            autoComplete="tel"
            inputMode="tel"
            maxLength={40}
            value={form.phone}
            onChange={update("phone")}
          />
        </label>

        <label className={styles.fieldWide}>
          <span>Professional headline</span>
          <input
            maxLength={160}
            placeholder="For example: Credit Analyst"
            value={form.headline}
            onChange={update("headline")}
          />
        </label>

        <label className={styles.field}>
          <span>Location</span>
          <input
            autoComplete="address-level2"
            maxLength={160}
            placeholder="Dar es Salaam"
            value={form.location}
            onChange={update("location")}
          />
        </label>

        <label className={styles.field}>
          <span>Experience level</span>
          <input
            maxLength={80}
            placeholder="For example: Mid level"
            value={form.experienceLevel}
            onChange={update("experienceLevel")}
          />
        </label>

        <label className={styles.field}>
          <span>Preferred work arrangement</span>
          <input
            maxLength={80}
            placeholder="On-site, Hybrid or Remote"
            value={form.workArrangement}
            onChange={update("workArrangement")}
          />
        </label>

        <label className={styles.field}>
          <span>Portfolio or professional link</span>
          <input
            type="url"
            inputMode="url"
            autoComplete="url"
            maxLength={500}
            placeholder="https://"
            value={form.portfolioUrl}
            onChange={update("portfolioUrl")}
          />
        </label>
      </div>

      <p className={styles.note}>
        CV and document uploads remain unavailable until Daraja has verified
        malware scanning for private candidate files.
      </p>

      {message && (
        <p
          className={messageClassName}
          role={status === "error" ? "alert" : "status"}
        >
          {message}
        </p>
      )}

      <div className={styles.actions}>
        <button type="submit" disabled={status === "loading"}>
          {status === "loading" ? "Saving..." : "Save profile"}
        </button>
      </div>
    </form>
  );
}
