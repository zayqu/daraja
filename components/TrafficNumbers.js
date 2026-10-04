"use client";

import { useEffect, useState } from "react";
import { formatCompactCount } from "@/lib/format-number";

const EMPTY_TRAFFIC = {
  totalVisits: 0,
  newVisitors: 0,
  returningVisitors: 0,
  pageViews: 0,
};

export default function TrafficNumbers({ className = "" }) {
  const [traffic, setTraffic] = useState(EMPTY_TRAFFIC);

  useEffect(() => {
    let active = true;

    fetch("/api/visitors", {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (!active || !payload) return;
        setTraffic({
          totalVisits: payload.totalVisits || 0,
          newVisitors: payload.newVisitors || 0,
          returningVisitors: payload.returningVisitors || 0,
          pageViews: payload.pageViews || 0,
        });
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  return (
    <span className={className} aria-label="Daraja visitor numbers">
      <span><strong>{formatCompactCount(traffic.totalVisits)}</strong> Visits</span>
      <span><strong>{formatCompactCount(traffic.newVisitors)}</strong> New</span>
      <span><strong>{formatCompactCount(traffic.returningVisitors)}</strong> Returning</span>
      <span><strong>{formatCompactCount(traffic.pageViews)}</strong> Page views</span>
    </span>
  );
}
