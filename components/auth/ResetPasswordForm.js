"use client";

import Link from "next/link";
import { useState } from "react";
import styles from "@/app/auth/auth.module.css";
import PasswordField from "./PasswordField";
import { postJson } from "./postJson";

export default function ResetPasswordForm({ email, token }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [state, setState] = useState("idle");
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    if (password !== confirm) {
      setError("The two passwords do not match.");
      return;
    }
    setState("saving");
    setError("");
    const { ok, data } = await postJson("/api/account/reset-password", { email, token, password });
    if (ok && data.redirectTo) {
      window.location.assign(data.redirectTo);
      return;
    }
    setError(data.error || "We could not save the new password.");
    setState("idle");
  }

  if (!email || !token) {
    return (
      <p className={styles.error} role="alert">
        This reset link is incomplete. <Link href="/auth/forgot-password">Request a new one</Link>.
      </p>
    );
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      <PasswordField
        id="reset-password"
        label="New password"
        autoComplete="new-password"
        value={password}
        onChange={setPassword}
        hint="At least 8 characters, with letters and a number."
      />
      <PasswordField
        id="reset-confirm"
        label="Repeat new password"
        autoComplete="new-password"
        value={confirm}
        onChange={setConfirm}
      />
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
      <button className={styles.primary} type="submit" disabled={state === "saving"}>
        {state === "saving" ? "Saving…" : "Save new password and sign in"}
      </button>
    </form>
  );
}
