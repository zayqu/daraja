"use client";

import { useState } from "react";
import styles from "@/app/auth/auth.module.css";
import { useT } from "@/components/LanguageProvider";

export default function PasswordField({ id, label, autoComplete, value, onChange, hint, aside }) {
  const t = useT();
  const [visible, setVisible] = useState(false);
  return (
    <div className={styles.field}>
      <div className={styles.labelRow}>
        <label htmlFor={id}>{label}</label>
        {aside}
      </div>
      <div className={styles.passwordWrap}>
        <input
          id={id}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          minLength={8}
          maxLength={128}
          required
        />
        <button
          type="button"
          className={styles.showToggle}
          onClick={() => setVisible((current) => !current)}
          aria-label={t(visible ? "Hide password" : "Show password")}
        >
          {t(visible ? "Hide" : "Show")}
        </button>
      </div>
      {hint ? <p className={styles.hint}>{hint}</p> : null}
    </div>
  );
}
