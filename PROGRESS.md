# Daraja Jobs production-readiness progress

Last updated: 27 July 2026

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
  prepared in pull request #18.
- Keyboard skip navigation, visible focus treatment and reduced-motion support
  are prepared in pull request #18.
- Runtime Google Fonts imports have been removed to improve privacy and
  rendering reliability.
- The hourly scraper no longer applies or resolves production migrations.
  Schema deployment is documented as a separate restore-point-gated operation.

## In progress

### Pull request #17 — category-based alerts

- Replaces free-text interests with controlled categories.
- Uses exact category matching for alert delivery.
- Centralises the category catalogue.
- Adds anonymous zero-result/search-demand records.
- Status: local validation and the Vercel preview check passed.
- Deployment blocker: a recent production database backup or restore point has
  not been confirmed.

### Pull request #18 — security, SEO and accessibility baseline

- Schema-free batch based directly on `master`.
- Adds CSP, HSTS, anti-framing, referrer and browser-capability restrictions.
- Adds `robots.txt`, `sitemap.xml`, skip navigation and motion preferences.
- Removes third-party runtime font requests and misleading daily-listing copy.
- Local validation: 32 tests, ESLint, Prisma validation and production build
  passed.
- Vercel preview deployment is ready; runtime smoke verification remains.

### Pull request #19 — public API guardrails

- Schema-free batch based directly on `master`.
- Adds bounded JSON parsing, media-type validation, response allowlisting and
  short public-read caching.
- Local validation: 30 tests, ESLint, Prisma validation and production build
  passed.
- Vercel preview deployment is ready; runtime smoke verification remains.

### Scraper migration-safety batch

- Schema-free batch stacked on pull request #18.
- Removes unattended Prisma migration commands from the hourly production
  scraper.
- Documents the restore-point, SQL-review and controlled-deployment procedure.
- Adds regression tests that fail if schema mutation returns to the scheduled
  scraper workflow.

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
3. Add immutable, unique job slugs with old-ID permanent redirects.
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
