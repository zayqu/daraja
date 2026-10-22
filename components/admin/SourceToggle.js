"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "./admin.module.css";

export default function SourceToggle({ id, name, enabled }) {
  const router = useRouter();
  const [on, setOn] = useState(enabled);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function toggle() {
    const next = !on;
    if (!next && !window.confirm(`Stop collecting jobs from ${name}? Jobs already on Daraja stay until they close.`)) return;
    setBusy(true);
    setError("");
    const response = await fetch(`/api/admin/sources/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: next }),
    }).catch(() => null);
    const payload = await response?.json().catch(() => ({}));
    setBusy(false);
    if (!response?.ok) {
      setError(payload?.error || "Not saved");
      return;
    }
    setOn(next);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={`${on ? "Turn off" : "Turn on"} ${name}`}
        className={`${styles.toggle} ${on ? styles.toggleOn : ""}`}
        disabled={busy}
        onClick={toggle}
      />
      {error ? <span className={styles.subtle} role="alert" style={{ color: "#b42318" }}>{error}</span> : null}
    </>
  );
}
