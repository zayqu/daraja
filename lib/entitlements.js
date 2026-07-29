export const PLAN_LIMITS = Object.freeze({
  FREE: Object.freeze({ activeVacancies: 1, candidateSearches: 0, featuredVacancies: 0, savedJobs: 25 }),
  EMPLOYER_BASIC: Object.freeze({ activeVacancies: 5, candidateSearches: 0, featuredVacancies: 0, savedJobs: 25 }),
  EMPLOYER_PRO: Object.freeze({ activeVacancies: 25, candidateSearches: 100, featuredVacancies: 3, savedJobs: 25 }),
  JOB_SEEKER_PREMIUM: Object.freeze({ activeVacancies: 0, candidateSearches: 0, featuredVacancies: 0, savedJobs: 250 }),
  FREELANCER: Object.freeze({ activeVacancies: 0, candidateSearches: 0, featuredVacancies: 0, savedJobs: 50 }),
});
export const billingEnabled = () => process.env.BILLING_ENABLED === "true";
export const sandboxCheckoutEnabled = () =>
  billingEnabled() &&
  process.env.PAYMENT_ENVIRONMENT === "sandbox" &&
  process.env.SANDBOX_PAYMENT_PROVIDER === "internal-test";
export function limitsForPlan(plan) {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.FREE;
}
export function entitlementDecision({ plan = "FREE", key, used = 0 }) {
  const limit = limitsForPlan(plan)[key];
  if (!Number.isInteger(limit)) return { allowed: false, limit: 0, remaining: 0 };
  return { allowed: used < limit, limit, remaining: Math.max(limit - used, 0) };
}
