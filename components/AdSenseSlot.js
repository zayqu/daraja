"use client";

import { useEffect, useState } from "react";
import {
  CONSENT_EVENT,
  CONSENT_STORAGE_KEY,
  isValidAdSenseClient,
  isValidAdSenseSlot,
} from "@/lib/google-services";

export default function AdSenseSlot({ slot, label = "Advertisement" }) {
  const client = process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT;
  const [consent, setConsent] = useState(null);

  useEffect(() => {
    const updateConsent = () => {
      setConsent(window.localStorage.getItem(CONSENT_STORAGE_KEY));
    };
    updateConsent();
    window.addEventListener(CONSENT_EVENT, updateConsent);
    return () => window.removeEventListener(CONSENT_EVENT, updateConsent);
  }, []);

  useEffect(() => {
    if (
      consent !== "accepted" ||
      !isValidAdSenseClient(client) ||
      !isValidAdSenseSlot(slot)
    ) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (error) {
      console.error("AdSense slot could not be initialized", error);
    }
  }, [client, consent, slot]);

  if (
    consent !== "accepted" ||
    !isValidAdSenseClient(client) ||
    !isValidAdSenseSlot(slot)
  ) return null;

  return (
    <aside
      aria-label={label}
      style={{
        minHeight: "100px",
        margin: "1.5rem 0",
        overflow: "hidden",
        textAlign: "center",
      }}
    >
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </aside>
  );
}
