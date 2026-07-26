"use client";

import { useEffect } from "react";

export default function AdSenseSlot({ slot, label = "Advertisement" }) {
  const client = process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT;

  useEffect(() => {
    if (!client || !slot) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (error) {
      console.error("AdSense slot could not be initialized", error);
    }
  }, [client, slot]);

  if (!client || !slot) return null;

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
