export function buildPublicJobWhere(status = "active", now = new Date()) {
  const where = { moderationStatus: "PUBLISHED", deadline: { not: null } };

  if (status === "expired") {
    where.OR = [{ active: false }, { deadline: { lt: now } }];
    return where;
  }

  if (status === "all") return where;

  where.active = true;
  where.deadline = { gte: now };
  delete where.OR;
  return where;
}
