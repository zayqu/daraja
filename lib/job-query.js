import { deadlineQueryCutoff } from "./job-deadline.js";

export function buildPublicJobWhere(status = "active", now = new Date()) {
  const where = { moderationStatus: "PUBLISHED" };
  const cutoff = deadlineQueryCutoff(now);

  if (status === "expired") {
    where.OR = [{ active: false }, { deadline: { lt: cutoff } }];
    return where;
  }

  if (status === "all") return where;

  where.active = true;
  where.OR = [{ deadline: null }, { deadline: { gte: cutoff } }];
  return where;
}
