"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "@/app/auth/auth.module.css";
import PasswordField from "./PasswordField";
import { postJson } from "./postJson";
import { useT } from "@/components/LanguageProvider";
import EmailOption from "./EmailOption";
import { rememberSignInMethod } from "./LastUsed";

export default function SignupForm({ employerEnabled, initialType = "candidate", hasSocial = false, socialCandidate = null, socialEmployer = null }) {
  const t = useT();
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
      rememberSignInMethod("email");
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
        <fieldset className={styles.accountTypes}>
          <legend className="sr-only">{t("Account type")}</legend>
          {[
            ["candidate", "I'm looking for work", "Find jobs, save them and build your CV"],
            ["employer", "I'm hiring", "Post vacancies after a quick verification"],
          ].map(([value, label, detail]) => (
            <label key={value} className={`${styles.accountType} ${accountType === value ? styles.accountTypeActive : ""}`}>
              <input
                type="radio"
                name="account-type"
                value={value}
                checked={accountType === value}
                onChange={() => setAccountType(value)}
              />
              <strong>{t(label)}</strong>
              <span>{t(detail)}</span>
            </label>
          ))}
        </fieldset>
      ) : null}

      <div className={styles.methods}>
        {accountType === "employer" ? socialEmployer : socialCandidate}
        {(accountType === "employer" ? socialEmployer : hasSocial) ? (
          <div className={styles.divider}><span>{t("or")}</span></div>
        ) : null}
        <EmailOption label="Sign up with email" defaultOpen={!hasSocial}>
      <form className={styles.form} onSubmit={submit}>
        <div className={styles.field}>
          <label htmlFor="signup-name">{t(employer ? "Your full name" : "Full name")}</label>
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
          <label htmlFor="signup-email">{t(employer ? "Work email" : "Email address")}</label>
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
          label={t("Create a password")}
          autoComplete="new-password"
          value={password}
          onChange={setPassword}
          hint={t("At least 8 characters, with letters and a number.")}
        />
        {error ? <p className={styles.error} role="alert">{t(error)}</p> : null}
        <button className={styles.primary} type="submit" disabled={state === "saving"}>
          {t(state === "saving"
            ? "Creating account…"
            : employer
              ? "Create employer account"
              : "Create account")}
        </button>
        {employer ? (
          <p className={styles.hint}>
            {t("After confirming your email you will add your company details. Daraja verifies employers before their vacancies go live.")}
          </p>
        ) : null}
      </form>
        </EmailOption>
      </div>
    </>
  );
}
