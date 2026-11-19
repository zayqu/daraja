"use client";

import { useState } from "react";
import styles from "@/app/account/linkedin/linkedin.module.css";

export default function LinkedInSharePanel({ connected, displayName, expiresAt }) {
  const [text, setText] = useState("");
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  async function publish(event) {
    event.preventDefault();
    setStatus("saving");
    setMessage("");
    try {
      const response = await fetch("/api/linkedin/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "LinkedIn could not publish the post.");
      setStatus("success");
      setMessage(data.postId ? `Published to LinkedIn. Post ID: ${data.postId}` : "Published to LinkedIn.");
      setText("");
    } catch (error) {
      setStatus("error");
      setMessage(error.message || "LinkedIn could not publish the post.");
    }
  }

  async function disconnect() {
    if (!window.confirm("Disconnect LinkedIn sharing from Daraja?")) return;
    setStatus("saving");
    setMessage("");
    try {
      const response = await fetch("/api/linkedin/connection", { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not disconnect LinkedIn.");
      window.location.reload();
    } catch (error) {
      setStatus("error");
      setMessage(error.message || "Could not disconnect LinkedIn.");
    }
  }

  if (!connected) {
    return (
      <div className={styles.connectBox}>
        <p>
          Connect your LinkedIn account only when you want Daraja to publish posts you explicitly approve.
          Normal Daraja sign-in does not request posting permission.
        </p>
        <a className={styles.primary} href="/api/linkedin/connect">Connect LinkedIn for sharing</a>
      </div>
    );
  }

  return (
    <div className={styles.stack}>
      <div className={styles.connection}>
        <div>
          <span>Connected LinkedIn account</span>
          <strong>{displayName || "LinkedIn member"}</strong>
          {expiresAt ? <small>Connection expires {new Date(expiresAt).toLocaleDateString()}</small> : null}
        </div>
        <button type="button" className={styles.secondary} onClick={disconnect} disabled={status === "saving"}>
          Disconnect
        </button>
      </div>

      <form className={styles.shareForm} onSubmit={publish}>
        <label htmlFor="linkedin-post">Post text</label>
        <textarea
          id="linkedin-post"
          value={text}
          onChange={(event) => setText(event.target.value)}
          maxLength={3000}
          rows={8}
          placeholder="Write the exact text you want Daraja to publish to LinkedIn."
          required
        />
        <div className={styles.formMeta}>
          <span>{text.length}/3000</span>
          <button className={styles.primary} type="submit" disabled={status === "saving" || !text.trim()}>
            {status === "saving" ? "Publishing…" : "Review complete — publish to LinkedIn"}
          </button>
        </div>
      </form>

      {message ? (
        <p className={status === "success" ? styles.success : styles.error} role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
