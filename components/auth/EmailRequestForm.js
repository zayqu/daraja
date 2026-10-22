"use client";

import { useState } from "react";
import styles from "@/app/auth/auth.module.css";
import { postJson } from "./postJson";

// One email field that posts to a "send me a link" endpoint
// (forgot password, resend confirmation).
export default function EmailRequestForm({ endpoint, buttonLabel, initialEmail = "" }) {
  const [email, setEmail] = useState(initialEmail);
  const [state, setState] = useState("idle");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setState("saving");
    setError("");
    setMessage("");
    const { ok, data } = await postJson(endpoint, { email });
    if (ok) setMessage(data.message || "Check your email.");
    else setError(data.error || "Something went wrong. Please try again.");
    setState("idle");
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      <div className={styles.field}>
        <label htmlFor="request-email">Email address</label>
        <input
          id="request-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="name@example.com"
          required
        />
      </div>
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
      {message ? <p className={styles.success} role="status">{message}</p> : null}
      <button className={styles.primary} type="submit" disabled={state === "saving"}>
        {state === "saving" ? "Sending…" : buttonLabel}
      </button>
    </form>
  );
}
