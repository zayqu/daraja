"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

// Saves a job to the signed-in user's "Saved jobs" (and removes it again).
// When `initialSaved` is not given (public job pages), the button asks the
// saved-jobs API once: it hides itself when the feature is switched off or the
// account has no "Saved jobs" page (admins, employers), and sends signed-out
// visitors to sign in first.
export default function SaveJobButton({
  jobId,
  initialSaved,
  className,
  refreshOnChange = false,
  savedLabel = "Saved ✓ (remove)",
}) {
  const router = useRouter();
  const pathname = usePathname();
  const known = typeof initialSaved === "boolean";
  const [state, setState] = useState(known ? (initialSaved ? "saved" : "idle") : "checking");
  const [error, setError] = useState("");

  useEffect(() => {
    if (known) return undefined;
    let cancelled = false;
    fetch("/api/candidate/saved-jobs", { credentials: "same-origin" })
      .then(async (response) => {
        if (cancelled) return;
        if (response.status === 404) return setState("hidden");
        if (response.status === 401) return setState("signedOut");
        if (!response.ok) return setState("idle");
        const payload = await response.json();
        if (payload.canSave === false) return setState("hidden");
        const saved = (payload.savedJobs || []).some((item) => item.jobId === jobId);
        if (!cancelled) setState(saved ? "saved" : "idle");
      })
      .catch(() => {
        if (!cancelled) setState("idle");
      });
    return () => {
      cancelled = true;
    };
  }, [jobId, known]);

  async function toggle() {
    if (state === "signedOut") {
      router.push(`/auth/signin?callbackUrl=${encodeURIComponent(pathname || "/jobs")}`);
      return;
    }
    const saving = state !== "saved";
    setState("busy");
    setError("");
    try {
      const response = await fetch("/api/candidate/saved-jobs", {
        method: saving ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      if (response.status === 401) {
        setState("signedOut");
        router.push(`/auth/signin?callbackUrl=${encodeURIComponent(pathname || "/jobs")}`);
        return;
      }
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Unable to update saved jobs");
      setState(saving ? "saved" : "idle");
      if (refreshOnChange) router.refresh();
    } catch (problem) {
      setError(problem.message);
      setState(saving ? "idle" : "saved");
    }
  }

  if (state === "hidden" || state === "checking") return null;

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={toggle}
        disabled={state === "busy"}
        aria-pressed={state === "saved"}
      >
        {state === "busy" ? "Saving…" : state === "saved" ? savedLabel : "Save job"}
      </button>
      {error ? <span role="alert">{error}</span> : null}
    </>
  );
}
