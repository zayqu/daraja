// Platform roles: who is an administrator, and where each kind of user lands.
//
// The owner's sign-in email is the only way an ADMIN role is created without
// another administrator (owner decision, 21 October 2026). Ownership of the
// email is proven by the sign-in itself (Google account or emailed magic
// link). Every other role change is made by an administrator from /admin and
// is audited.

const DEFAULT_OWNER_EMAILS = ["admin@daraja.co.tz"];

export const ASSIGNABLE_ROLES = ["JOB_SEEKER", "EMPLOYER", "ADMIN"];

export const ROLE_LABELS = {
  JOB_SEEKER: "Candidate",
  EMPLOYER: "Employer",
  FREELANCER: "Freelancer",
  ADMIN: "Admin",
};

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

export function ownerEmails() {
  const configured = String(process.env.DARAJA_OWNER_EMAILS || "")
    .split(",")
    .map(normalizeEmail)
    .filter(Boolean);
  return configured.length ? configured : DEFAULT_OWNER_EMAILS;
}

export function isOwnerEmail(email) {
  const value = normalizeEmail(email);
  return Boolean(value) && ownerEmails().includes(value);
}

// The dashboard each role opens after signing in.
export function roleHome(role, { employerPortal = false } = {}) {
  if (role === "ADMIN") return "/admin";
  if (role === "EMPLOYER" && employerPortal) return "/employer";
  return "/account";
}
