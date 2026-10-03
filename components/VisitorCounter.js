"use client";

import { useEffect, useRef, useState } from "react";
import {
  CONSENT_EVENT,
  CONSENT_STORAGE_KEY,
} from "@/lib/google-services";

function acceptedConsent() {
  if (typeof window === "undefined") return false;

  try {
    if (window.localStorage.getItem(CONSENT_STORAGE_KEY) === "accepted") {
      return true;
    }
  } catch {}

  return document.cookie
    .split("; ")
    .some((entry) => entry === `${CONSENT_STORAGE_KEY}=accepted`);
}

export default function VisitorCounter({ initialCount = 0 }) {
  const [count, setCount] = useState(initialCount);
  const sent = useRef(false);

  useEffect(() => {
    async function recordVisitor() {
      if (sent.current || !acceptedConsent()) return;
      sent.current = true;

      try {
        const response = await fetch("/api/visitors", {
          method: "POST",
          headers: {
            "x-daraja-consent": "accepted",
          },
          credentials: "same-origin",
        });
        if (!response.ok) return;
        const payload = await response.json();
        if (Number.isInteger(payload.uniqueVisitors)) {
          setCount(payload.uniqueVisitors);
        }
      } catch {
        // Visitor measurement must never interfere with job discovery.
      }
    }

    recordVisitor();

    function onConsent(event) {
      if (event.detail === "accepted") recordVisitor();
    }

    window.addEventListener(CONSENT_EVENT, onConsent);
    return () => window.removeEventListener(CONSENT_EVENT, onConsent);
  }, []);

  return (
    <>
      <strong>{count.toLocaleString()}</strong>
      <span>Visitors this month</span>
    </>
  );
}
