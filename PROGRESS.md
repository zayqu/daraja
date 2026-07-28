# Daraja Jobs production-readiness progress

Last updated: 28 July 2026

## Current objective

Build Daraja Jobs into a reliable Tanzania-first SaaS platform through small,
tested vertical releases. Preserve public job discovery without registration and
require accounts only for personalised or protected features.

## Completed and verified

- Active, expired and all-job filtering with URL-preserved search state.
- Job-source automation runs hourly with isolated source adapters.
- Ajira Portal uses the official vacancy API and job-specific application URLs.
- AjiraWeb imports verified individual roles instead of generic roundup posts.
- Direct employer application links and professional email application links.
- Role-based job categorisation across the shared public category catalogue.
- Mobile job-detail content order:
  title, details, position description, application and related jobs.
- Consistent application CTA wording.
- Responsive email and WhatsApp subscription interface.
- Global browser-security headers, crawl controls and a public sitemap are
  deployed.
- Keyboard skip navigation, visible focus treatment and reduced-motion support
  are deployed.
- Runtime Google Fonts imports have been removed to improve privacy and
  rendering reliability.
- The hourly scraper no longer applies or resolves production migrations.
  Schema deployment is documented as a separate restore-point-gated operation.
- Privacy-aware GA4 tracking is deployed and production measurement is active.
- Candidate funnel events for search, filters, job views, applications, shares
  and subscriptions were merged in pull request #27.

## In progress

### Pull request #28 — immutable job URLs

- Replaces database-key public URLs with immutable title-and-employer slugs.
- Preserves existing links through permanent canonical redirects.
- Generates collision-resistant slugs without exposing database IDs.
- Local validation: 46 tests, ESLint, Prisma validation and production build
  passed.
- Deployment blocker: a recent Neon production restore point has not been
  confirmed, so the additive slug migration must not be deployed yet.

### Secure unsubscribe flow

- Replaces state-changing email-link GET requests with a confirmation page.
- Adds standards-compliant one-click POST unsubscribe headers for supporting
  email clients.
- Requires no database migration.

## Safety blockers

### Production database backup not confirmed

Do not merge or deploy schema-changing pull requests until a recent Neon
production backup or restore point is confirmed. Do not run destructive or
irreversible migrations unattended.

### Provider credentials and sandbox verification

- `RESEND_API_KEY` and `JOB_ALERTS_FROM_EMAIL` are referenced by the workflow.
- End-to-end delivery has not been verified with a sandbox/test inbox.
- No WhatsApp Business API integration is configured; the public CTA links to
  the official Daraja WhatsApp Channel only.
- Do not send test alerts to real subscribers.

## Next safe implementation batches

1. Confirm database backup/restore point and preview/staging environment.
2. Finish subscriptions vertically:
   verification, preferences, delivery log, idempotent retry and unsubscribe.
3. Deploy immutable job slugs after the restore-point gate is satisfied.
4. Add job lifecycle/source-health models and revalidation.
5. Add secure authentication and role-based candidate, employer and admin
   vertical flows.
6. Add entitlements and sandbox billing behind feature flags.
7. Complete accessibility, security, SEO, performance and responsive QA.

## Definition-of-done evidence

Every batch must record:

- Migrations and rollback/restore assumptions.
- Test, lint, type-check and production-build results.
- Preview deployment URL and smoke-test result.
- Commit and pull-request links.
- Remaining external configuration or production blockers.
