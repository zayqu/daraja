# Daraja Jobs production-readiness progress

Last updated: 27 July 2026

## Current objective

Build Daraja Jobs into a reliable Tanzania-first SaaS platform through small,
tested vertical releases while preserving public discovery without registration.

## Completed and verified

- Active, expired and all-job filtering with URL-preserved search state.
- Hourly source automation with official Ajira vacancy links.
- Individual AjiraWeb roles, direct application links and role categories.
- Mobile-first job details and consistent application actions.
- Public JSON endpoints now enforce media types and streamed byte limits.
- Public job details use an explicit response allowlist that excludes internal
  source identity, moderation, employer and application fields.
- Successful public reads use short CDN caching to reduce database load.

## In progress

- PR #17: category-based alerts and anonymous search-demand insights.
  Local validation and Vercel passed; production migration is blocked pending a
  confirmed recent Neon restore point.
- PR #18: schema-free browser security, SEO and accessibility baseline.
- Public API guardrails: schema-free follow-up prepared and validated locally.
  Thirty automated tests, ESLint and Prisma validation passed. The full
  production build passed with Next.js Webpack; Turbopack could not inspect the
  sandbox-only dependency symlink, which is not used by Vercel or the repository.

## Safety blockers

- Do not merge schema-changing work until a recent production Neon backup or
  restore point is confirmed.
- Email delivery has not been verified end to end with a sandbox inbox.
- No WhatsApp Business API integration is configured.
- Never send test alerts to real subscribers.

## Next safe implementation batches

1. Confirm the production restore point and a preview/staging database.
2. Add verified alert subscriptions, preferences, idempotent delivery and logs.
3. Add immutable job slugs with permanent legacy-ID redirects.
4. Add source health, lifecycle reliability and revalidation.
5. Add authenticated candidate, employer and administrator vertical flows.
6. Add entitlements and sandbox billing behind feature flags.

## Definition-of-done evidence

Every batch must record migrations and restore assumptions, full validation,
preview smoke tests, commit and pull-request links, and remaining blockers.
