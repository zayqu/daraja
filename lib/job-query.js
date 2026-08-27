export function buildPublicJobWhere(status = "active", now = new Date()) {
  const where = { moderationStatus: "PUBLISHED" };

  if (status === "expired") {
    where.OR = [{ active: false }, { deadline: { lt: now } }];
    return where;
  }

  if (status === "all") return where;

  where.active = true;
  where.OR = [{ deadline: null }, { deadline: { gte: now } }];
  return where;
}
