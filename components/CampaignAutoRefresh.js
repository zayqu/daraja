"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function CampaignAutoRefresh() {
  const router = useRouter();
  const [lastRequested, setLastRequested] = useState(null);

  const refresh = useCallback(() => {
    router.refresh();
    setLastRequested(new Date());
  }, [router]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, 60_000);
    return () => clearInterval(timer);
  }, [refresh]);

  return (
    <p>
      <small>
        Outbound redirect counts refresh about once a minute while this page is open.
        WhatsApp Channel views and partner-reported hiring outcomes update only after
        their source figures have been verified and entered.
        {lastRequested ? ` Latest refresh requested: ${lastRequested.toLocaleTimeString("en-GB", {timeZone: "Africa/Dar_es_Salaam"})} EAT.` : ""}
      </small>
      {" "}
      <button type="button" onClick={refresh}>Refresh report</button>
    </p>
  );
}
