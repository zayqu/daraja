export const VISITOR_PERIOD_COOKIE = "daraja-visitor-period-v1";
export const VISITOR_SEEN_COOKIE = "daraja-seen-v1";
export const VISITOR_SESSION_COOKIE = "daraja-session-v1";
export const VISITOR_TIME_ZONE = "Africa/Dar_es_Salaam";

export function currentVisitorPeriod(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: VISITOR_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  return year && month ? `${year}-${month}` : date.toISOString().slice(0, 7);
}

export function isLikelyBot(userAgent) {
  return /bot|crawler|spider|slurp|preview|facebookexternalhit|whatsapp|telegrambot|uptime|monitor|headless/i.test(
    String(userAgent || "")
  );
}
