"use client";

import { useState } from "react";
import styles from "@/components/dashboard/dashboard.module.css";

// Emails the signed-in user a one-time link to set a new password, reusing the
// "Forgot password" flow (same throttling and same email).
export default function PasswordResetButton({ email }) {
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  async function send() {
    setStatus("loading");
    setMessage("");
    try {
      const response = await fetch("/api/account/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Unable to send the link. Please try again later.");
      setStatus("sent");
      setMessage(`We sent a link to ${email}. It works once and expires soon.`);
    } catch (problem) {
      setStatus("error");
      setMessage(problem.message);
    }
  }

  return (
    <div>
      <button type="button" className={styles.button} onClick={send} disabled={status === "loading" || status === "sent"}>
        {status === "loading" ? "Sending…" : status === "sent" ? "Link sent" : "Email me a password link"}
      </button>
      {message ? (
        <p className={status === "error" ? styles.errorText : styles.help} role={status === "error" ? "alert" : "status"}>
          {message}
        </p>
      ) : null}
    </div>
  );
}
