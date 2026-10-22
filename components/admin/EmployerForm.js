"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "./admin.module.css";

export default function EmployerForm({ employer = null }) {
  const router = useRouter();
  const editing = Boolean(employer?.id);
  const [values, setValues] = useState({
    email: "",
    companyName: employer?.companyName || "",
    industry: employer?.industry || "",
    website: employer?.website || "",
    logo: employer?.logo || "",
    verify: true,
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
    try {
      const profile = {
        companyName: values.companyName,
        industry: values.industry,
        website: values.website,
        logo: values.logo,
      };
      const response = await fetch(editing ? `/api/admin/employers/${employer.id}` : "/api/admin/employers", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing ? { profile } : { ...profile, email: values.email, verify: values.verify }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "The company was not saved.");
      if (editing) {
        setSaved("Company details saved.");
        router.refresh();
      } else {
        router.push(`/admin/employers/${payload.employer.id}`);
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
        {!editing ? (
          <div className={`${styles.field} ${styles.full}`}>
            <label htmlFor="employer-email">Account email of the person who will manage this company</label>
            <input id="employer-email" className={styles.input} type="email" value={values.email} onChange={set("email")} required />
            <p className={styles.help}>They must already have a Daraja account. Their account becomes an employer account.</p>
          </div>
        ) : null}
        <div className={styles.field}>
          <label htmlFor="employer-name">Company name</label>
          <input id="employer-name" className={styles.input} value={values.companyName} onChange={set("companyName")} maxLength={160} required />
        </div>
        <div className={styles.field}>
          <label htmlFor="employer-industry">Industry</label>
          <input id="employer-industry" className={styles.input} value={values.industry} onChange={set("industry")} maxLength={160} />
        </div>
        <div className={styles.field}>
          <label htmlFor="employer-website">Website</label>
          <input id="employer-website" className={styles.input} type="url" value={values.website} onChange={set("website")} placeholder="https://" />
        </div>
        <div className={styles.field}>
          <label htmlFor="employer-logo">Logo image address</label>
          <input id="employer-logo" className={styles.input} type="url" value={values.logo} onChange={set("logo")} placeholder="https://…/logo.png" />
        </div>
        {!editing ? (
          <div className={`${styles.field} ${styles.full}`}>
            <label>
              <input type="checkbox" checked={values.verify} onChange={set("verify")} /> Mark as verified now
            </label>
          </div>
        ) : null}
      </div>
      <div className={styles.formActions}>
        <button type="button" className={styles.button} onClick={() => router.push("/admin/employers")}>Cancel</button>
        <button type="submit" className={styles.buttonPrimary} disabled={state === "saving"}>
          {state === "saving" ? "Saving…" : editing ? "Save company" : "Add employer"}
        </button>
      </div>
    </form>
  );
}
