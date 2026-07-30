const WEB_VITAL_NAMES = new Set(["CLS", "FCP", "INP", "LCP", "TTFB"]);

export function createWebVitalEvent(metric = {}) {
  if (!WEB_VITAL_NAMES.has(metric.name)) return null;

  const delta = Number(metric.delta);
  if (!Number.isFinite(delta) || delta < 0) return null;

  return {
    eventName: metric.name,
    params: {
      event_category: "Web Vitals",
      event_label: String(metric.id || "").slice(0, 120),
      value: Math.round(metric.name === "CLS" ? delta * 1000 : delta),
      non_interaction: true,
    },
  };
}
