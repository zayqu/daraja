"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "./admin.module.css";

// One editable site setting (switch, text or one-phrase-per-line list).
export default function SettingField({ setting }) {
  const router = useRouter();
  const [value, setValue] = useState(
    setting.type === "list" ? (setting.value || []).join("\n") : setting.value ?? ""
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function save(body) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: setting.key, ...body }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Not saved");
      setMessage("Saved");
      router.refresh();
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.settingRow}>
      <div className={styles.settingText}>
        <label htmlFor={`setting-${setting.key}`}>{setting.label}</label>
        <p className={styles.help}>
          {setting.help} {setting.isDefault ? <em>(using the server default)</em> : null}
        </p>
      </div>
      <div className={styles.settingControl}>
        {setting.type === "boolean" ? (
          <button
            id={`setting-${setting.key}`}
            type="button"
            role="switch"
            aria-checked={value === true}
            className={`${styles.toggle} ${value === true ? styles.toggleOn : ""}`}
            disabled={busy}
            onClick={() => {
              const next = value !== true;
              setValue(next);
              save({ value: next });
            }}
          />
        ) : (
          <form
            className={styles.settingForm}
            onSubmit={(event) => {
              event.preventDefault();
              save({ value: setting.type === "list" ? value.split("\n") : value });
            }}
          >
            {setting.type === "list" ? (
              <textarea
                id={`setting-${setting.key}`}
                className={`${styles.textarea} ${styles.textareaSmall}`}
                value={value}
                onChange={(event) => setValue(event.target.value)}
                placeholder="One phrase per line"
              />
            ) : (
              <input
                id={`setting-${setting.key}`}
                className={styles.input}
                value={value}
                onChange={(event) => setValue(event.target.value)}
              />
            )}
            <button type="submit" className={styles.buttonPrimary} disabled={busy}>
              {busy ? "Saving…" : "Save"}
            </button>
          </form>
        )}
        {!setting.isDefault ? (
          <button type="button" className={styles.buttonGhost} disabled={busy} onClick={() => save({ reset: true })}>
            Use default
          </button>
        ) : null}
        {message ? <span className={styles.subtle} role="status">{message}</span> : null}
        {error ? <span className={styles.errorText} role="alert">{error}</span> : null}
      </div>
    </div>
  );
}
