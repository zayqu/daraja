"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export default function TrafficTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastPath = useRef(null);

  useEffect(() => {
    const query = searchParams?.toString();
    const path = query ? `${pathname}?${query}` : pathname;
    if (!path || lastPath.current === path) return;
    lastPath.current = path;

    fetch("/api/visitors", {
      method: "POST",
      credentials: "same-origin",
      keepalive: true,
    }).catch(() => {
      // Traffic measurement must never interfere with navigation.
    });
  }, [pathname, searchParams]);

  return null;
}
