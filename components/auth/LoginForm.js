"use client";

import Link from "next/link";
import { useState } from "react";
import styles from "@/app/auth/auth.module.css";
import PasswordField from "./PasswordField";
import { postJson } from "./postJson";

export default function LoginForm({ callbackUrl, initialError }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState("idle");
  const [error, setError] = useState(initialError || "");
  const [notice, setNotice] = useState("");
  const [unverified, setUnverified] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setState("saving");
    setError("");
    setNotice("");
    setUnverified(false);
    const { ok, data } = await postJson("/api/account/login", { email, password, callbackUrl });
    if (ok && data.redirectTo) {
      window.location.assign(data.redirectTo);
      return;
    }
    setUnverified(data.code === "EMAIL_NOT_VERIFIED");
    setError(data.error || "Sign-in failed. Please try again.");
    setState("idle");
  }

  async function resend() {
    const { data } = await postJson("/api/account/resend-verification", { email });
    setError("");
    setUnverified(false);
    setNotice(data.message || "If that account is waiting for confirmation, we sent a new link.");
  }

  return (
    <form className={styles.form} onSubmit={submit} noValidate={false}>
      <div className={styles.field}>
        <label htmlFor="login-email">Email address</label>
        <input
          id="login-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="name@example.com"
          required
        />
      </div>
      <PasswordField
        id="login-password"
        label="Password"
        autoComplete="current-password"
        value={password}
        onChange={setPassword}
        aside={<Link className={styles.smallLink} href="/auth/forgot-password">Forgot password?</Link>}
      />
      {error ? (
        <p className={styles.error} role="alert">
          {error}{" "}
          {unverified ? (
            <button type="button" className={styles.textButton} onClick={resend}>
              Send the link again
            </button>
          ) : null}
        </p>
      ) : null}
      {notice ? <p className={styles.success} role="status">{notice}</p> : null}
      <button className={styles.primary} type="submit" disabled={state === "saving"}>
        {state === "saving" ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
