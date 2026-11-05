// A job deadline is a calendar day, not an instant in the viewer's timezone.
// Existing Prisma DateTime records encode the stated calendar day in UTC.
// Keep that date until a reviewed date-only database migration is approved.
const DAY_MS = 86_400_000;
const TZ_ZONE = "Africa/Dar_es_Salaam";

export function deadlineDay(value) {
  if (!value) return null;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}(?:$|T)/.test(value)) {
    const day = value.slice(0, 10);
    const timestamp = Date.parse(day + "T00:00:00.000Z");
    return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === day ? day : null;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 10) : null;
}

export function todayInTanzania(now = new Date()) {
  const date = now instanceof Date ? now : new Date(now);
  if (!Number.isFinite(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(date);
}

export function daysUntilDeadline(value, now = new Date()) {
  const closing = deadlineDay(value);
  const today = todayInTanzania(now);
  if (!closing || !today) return null;
  return Math.round((Date.parse(closing + "T00:00:00Z") - Date.parse(today + "T00:00:00Z")) / DAY_MS);
}

export function formatDeadline(value, { month = "short" } = {}) {
  const day = deadlineDay(value);
  if (!day) return null;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC", day: "numeric", month, year: "numeric",
  }).format(new Date(day + "T12:00:00Z"));
}

export function deadlineStatus(value, now = new Date()) {
  const days = daysUntilDeadline(value, now);
  if (days === null) return null;
  if (days < 0) return "Closed";
  if (days === 0) return "Closes today";
  if (days === 1) return "Closes tomorrow";
  if (days <= 7) return `Closes in ${days} days`;
  return `Deadline: ${formatDeadline(value)}`;
}
