"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "@/app/auth/auth.module.css";
import PasswordField from "./PasswordField";
import { postJson } from "./postJson";

export default function SignupForm({ employerEnabled, initialType = "candidate", socialCandidate = null, socialEmployer = null }) {
  const router = useRouter();
  const [accountType, setAccountType] = useState(
    employerEnabled && initialType === "employer" ? "employer" : "candidate"
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState("idle");
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setState("saving");
    setError("");
    const { ok, data } = await postJson("/api/account/register", { name, email, password, accountType });
    if (ok) {
      router.push(`/auth/check-email?email=${encodeURIComponent(email)}`);
      return;
    }
    setError(data.error || "We could not create the account. Please try again.");
    setState("idle");
  }

  const employer = accountType === "employer";

  return (
    <>
      {employerEnabled ? (
        <div className={styles.tabs} role="tablist" aria-label="Account type">
          {[
            ["candidate", "I'm looking for work"],
            ["employer", "I'm hiring"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={accountType === value}
              className={`${styles.tab} ${accountType === value ? styles.tabActive : ""}`}
              onClick={() => setAccountType(value)}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}

      {accountType === "employer" ? socialEmployer : socialCandidate}

      <form className={styles.form} onSubmit={submit}>
        <div className={styles.field}>
          <label htmlFor="signup-name">{employer ? "Your full name" : "Full name"}</label>
          <input
            id="signup-name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={120}
            required
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="signup-email">{employer ? "Work email" : "Email address"}</label>
          <input
            id="signup-email"
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
          id="signup-password"
          label="Create a password"
          autoComplete="new-password"
          value={password}
          onChange={setPassword}
          hint="At least 8 characters, with letters and a number."
        />
        {error ? <p className={styles.error} role="alert">{error}</p> : null}
        <button className={styles.primary} type="submit" disabled={state === "saving"}>
          {state === "saving"
            ? "Creating account…"
            : employer
              ? "Create employer account"
              : "Create account"}
        </button>
        {employer ? (
          <p className={styles.hint}>
            After confirming your email you will add your company details. Daraja
            verifies employers before their vacancies go live.
          </p>
        ) : null}
      </form>
    </>
  );
}
