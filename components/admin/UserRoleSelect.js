"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "./admin.module.css";

const ROLES = [
  ["JOB_SEEKER", "Candidate"],
  ["EMPLOYER", "Employer"],
  ["ADMIN", "Admin"],
];

const roleLabel = (role) => ROLES.find(([key]) => key === role)?.[1] || role;

export default function UserRoleSelect({ userId, userName, role, locked }) {
  const router = useRouter();
  const [savedRole, setSavedRole] = useState(role);
  const [selectedRole, setSelectedRole] = useState(role);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function save() {
    if (busy || selectedRole === savedRole) return;
    const name = userName || "this user";
    if (!window.confirm(`Change ${name}'s role from ${roleLabel(savedRole)} to ${roleLabel(selectedRole)}?${selectedRole === "ADMIN" ? " This grants full admin access." : ""}`)) return;

    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: selectedRole }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(payload?.error || "Role was not saved");
        return;
      }
      setSavedRole(payload.user.role);
      setSelectedRole(payload.user.role);
      setSuccess(`Role updated for ${name}.`);
      router.refresh();
    } catch {
      setError("Network problem. The role was not saved.");
    } finally {
      setBusy(false);
    }
  }

  if (locked) return <span>{roleLabel(role)}</span>;

  return (
    <div>
      <select
        className={styles.select}
        value={selectedRole}
        onChange={(event) => {
          setSelectedRole(event.target.value);
          setSuccess("");
          setError("");
        }}
        disabled={busy}
        aria-label={`Role for ${userName || "user"}`}
      >
        {ROLES.map(([key, label]) => (
          <option key={key} value={key}>{label}</option>
        ))}
      </select>
      {selectedRole !== savedRole ? (
        <button type="button" className={styles.button} disabled={busy} onClick={save} aria-label={`Save role change for ${userName || "user"}`}>
          {busy ? "Saving…" : "Save role"}
        </button>
      ) : null}
      {error ? <span className={styles.subtle} role="alert" style={{ color: "#b42318" }}>{error}</span> : null}
      {success ? <span className={styles.subtle} role="status">{success}</span> : null}
    </div>
  );
}
