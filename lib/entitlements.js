const NO_ENTITLEMENTS = Object.freeze({
  activeVacancies: 0,
  candidateSearches: 0,
  featuredVacancies: 0,
  savedJobs: 0,
});

export const FREE_LIMITS_BY_ROLE = Object.freeze({
  EMPLOYER: Object.freeze({ ...NO_ENTITLEMENTS, activeVacancies: 1 }),
  JOB_SEEKER: Object.freeze({ ...NO_ENTITLEMENTS, savedJobs: 25 }),
  FREELANCER: Object.freeze({ ...NO_ENTITLEMENTS, savedJobs: 25 }),
  ADMIN: NO_ENTITLEMENTS,
});

export const PLAN_LIMITS = Object.freeze({
  EMPLOYER_BASIC: Object.freeze({ activeVacancies: 5, candidateSearches: 0, featuredVacancies: 0, savedJobs: 25 }),
  EMPLOYER_PRO: Object.freeze({ activeVacancies: 25, candidateSearches: 100, featuredVacancies: 3, savedJobs: 25 }),
  JOB_SEEKER_PREMIUM: Object.freeze({ activeVacancies: 0, candidateSearches: 0, featuredVacancies: 0, savedJobs: 250 }),
  FREELANCER: Object.freeze({ activeVacancies: 0, candidateSearches: 0, featuredVacancies: 0, savedJobs: 50 }),
});

// Test-only amounts used to exercise invoice and idempotency paths. They are
// not production pricing and cannot trigger an external payment provider.
export const SANDBOX_PLAN_PRICES_MINOR = Object.freeze({
  EMPLOYER_BASIC: 4_900_000,
  EMPLOYER_PRO: 14_900_000,
  JOB_SEEKER_PREMIUM: 1_000_000,
});

const PLAN_ROLES = Object.freeze({
  EMPLOYER_BASIC: new Set(["EMPLOYER"]),
  EMPLOYER_PRO: new Set(["EMPLOYER"]),
  JOB_SEEKER_PREMIUM: new Set(["JOB_SEEKER"]),
  FREELANCER: new Set(["FREELANCER"]),
});

export const billingEnabled = () => process.env.BILLING_ENABLED === "true";

export const sandboxCheckoutEnabled = () =>
  billingEnabled() &&
  process.env.PAYMENT_ENVIRONMENT === "sandbox" &&
  process.env.SANDBOX_PAYMENT_PROVIDER === "internal-test";

export function limitsForPlan(plan, role) {
  const freeLimits = FREE_LIMITS_BY_ROLE[role] || NO_ENTITLEMENTS;
  if (!PLAN_LIMITS[plan]) return freeLimits;
  return planAvailableToRole(plan, role) ? PLAN_LIMITS[plan] : freeLimits;
}

export function planAvailableToRole(plan, role) {
  return PLAN_ROLES[plan]?.has(role) === true;
}

export function entitlementDecision({ plan = "FREE", role, key, used = 0 }) {
  const limit = limitsForPlan(plan, role)[key];
  if (!Number.isInteger(limit) || !Number.isInteger(used) || used < 0) {
    return { allowed: false, limit: 0, remaining: 0 };
  }
  return {
    allowed: used < limit,
    limit,
    remaining: Math.max(limit - used, 0),
  };
}
