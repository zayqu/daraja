"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "./admin.module.css";

const ROLES = [
  ["JOB_SEEKER", "Candidate"],
  ["EMPLOYER", "Employer"],
  ["ADMIN", "Admin"],
];

export default function UserRoleSelect({ userId, role, locked }) {
  const router = useRouter();
  const [value, setValue] = useState(role);
  const [error, setError] = useState("");

  async function change(next) {
    if (next === "ADMIN" && !window.confirm("Give this person full admin access to Daraja?")) return;
    const previous = value;
    setValue(next);
    setError("");
    const response = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: next }),
    }).catch(() => null);
    const payload = await response?.json().catch(() => ({}));
    if (!response?.ok) {
      setValue(previous);
      setError(payload?.error || "Role was not saved");
      return;
    }
    router.refresh();
  }

  if (locked) {
    return <span>{ROLES.find(([key]) => key === role)?.[1] || role}</span>;
  }
  return (
    <>
      <select
        className={styles.select}
        value={value}
        onChange={(event) => change(event.target.value)}
        aria-label="Role"
      >
        {ROLES.map(([key, label]) => (
          <option key={key} value={key}>{label}</option>
        ))}
      </select>
      {error ? <span className={styles.subtle} role="alert" style={{ color: "#b42318" }}>{error}</span> : null}
    </>
  );
}
