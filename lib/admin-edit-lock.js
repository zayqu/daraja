// A vacancy an administrator has edited is locked against scraper refreshes:
// the next scrape of the same source must not overwrite the corrections.
// The lock is the audit event the admin edit writes, so no schema change.

const ADMIN_EDIT_ACTION = "JOB_EDITED_BY_ADMIN";

async function isAdminEdited(prisma, jobId) {
  if (!jobId || typeof prisma?.auditEvent?.findFirst !== "function") return false;
  const event = await prisma.auditEvent.findFirst({
    where: { entityType: "Job", entityId: jobId, action: ADMIN_EDIT_ACTION },
    select: { id: true },
  });
  return Boolean(event);
}

module.exports = { ADMIN_EDIT_ACTION, isAdminEdited };
