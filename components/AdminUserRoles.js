"use client";

import { useState } from "react";
import styles from "./AdminJobReviewQueue.module.css";

const ROLE_OPTIONS = [
  { value: "JOB_SEEKER", label: "Candidate" },
  { value: "EMPLOYER", label: "Employer" },
  { value: "ADMIN", label: "Admin" },
];

function roleLabel(role) {
  return ROLE_OPTIONS.find((option) => option.value === role)?.label || role;
}

function UserItem({ user, isSelf }) {
  const [role, setRole] = useState(user.role);
  const [saved, setSaved] = useState(user.role);
  const [state, setState] = useState("idle");
  const [error, setError] = useState("");
  const locked = isSelf || user.owner;

  async function save() {
    setState("saving");
    setError("");
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Role was not saved");
      setSaved(role);
      setState("saved");
    } catch (saveError) {
      setError(saveError.message);
      setState("idle");
    }
  }

  return (
    <li className={styles.item}>
      <div className={styles.heading}>
        <h3>{user.name || user.email}</h3>
        <p>{user.email}</p>
      </div>

      <dl className={styles.facts}>
        <div>
          <dt>Current role</dt>
          <dd>{roleLabel(saved)}{user.owner ? " (owner)" : ""}</dd>
        </div>
        <div>
          <dt>Joined</dt>
          <dd>{new Date(user.createdAt).toLocaleDateString("en-GB")}</dd>
        </div>
      </dl>

      {locked ? (
        <p className={styles.reason}>
          {user.owner
            ? "The owner account is always an admin."
            : "You cannot change your own role."}
        </p>
      ) : (
        <div className={styles.actions}>
          <select
            value={role}
            onChange={(event) => {
              setRole(event.target.value);
              setState("idle");
            }}
            aria-label={`Role for ${user.email}`}
          >
            {ROLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            className={styles.publish}
            disabled={state === "saving" || role === saved}
            onClick={save}
          >
            {state === "saved" && role === saved ? "Saved" : "Save role"}
          </button>
        </div>
      )}
      {error && <p className={styles.error} role="alert">{error}</p>}
    </li>
  );
}

export default function AdminUserRoles({ users, query, currentUserId }) {
  return (
    <div>
      <form method="get" action="/admin#users-title">
        <input
          type="search"
          name="user"
          className={styles.search}
          defaultValue={query}
          placeholder="Search users by email or name"
          aria-label="Search users"
        />
      </form>
      {users.length ? (
        <ul className={styles.list}>
          {users.map((user) => (
            <UserItem key={user.id} user={user} isSelf={user.id === currentUserId} />
          ))}
        </ul>
      ) : (
        <p className={styles.empty}>No users match this search.</p>
      )}
    </div>
  );
}
