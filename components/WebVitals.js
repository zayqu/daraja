"use client";

import { useReportWebVitals } from "next/web-vitals";
import { CONSENT_STORAGE_KEY, isValidGoogleAnalyticsId } from "@/lib/google-services";
import { createWebVitalEvent } from "@/lib/web-vitals";

export default function WebVitals({ analyticsId }) {
  useReportWebVitals((metric) => {
    if (
      !isValidGoogleAnalyticsId(analyticsId) ||
      window.localStorage.getItem(CONSENT_STORAGE_KEY) !== "accepted" ||
      typeof window.gtag !== "function"
    ) {
      return;
    }

    const event = createWebVitalEvent(metric);
    if (!event) return;

    window.gtag("event", event.eventName, {
      ...event.params,
      send_to: analyticsId,
    });
  });

  return null;
}
