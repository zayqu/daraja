"use client";

import { useEffect } from "react";

// Counts one view of this job per browser per day for the employer's
// "Views" numbers. Browser storage only remembers that today's view was sent.
export default function JobViewBeacon({ jobId }) {
  useEffect(() => {
    if (!jobId) return;
    const today = new Date().toISOString().slice(0, 10);
    const key = `daraja:viewed:${jobId}`;
    try {
      if (window.localStorage.getItem(key) === today) return;
      window.localStorage.setItem(key, today);
    } catch {
      // Private mode: still count the view.
    }
    fetch(`/api/jobs/${encodeURIComponent(jobId)}/view`, { method: "POST", keepalive: true }).catch(() => {});
  }, [jobId]);
  return null;
}
