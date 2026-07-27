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
  prepared in the security, SEO and accessibility pull request.
- Keyboard skip navigation, visible focus treatment and reduced-motion support
  are prepared in the security, SEO and accessibility pull request.
- Runtime Google Fonts imports have been removed to improve privacy and
  rendering reliability.

## In progress

### Pull request #17 — category-based alerts

- Replaces free-text interests with controlled categories.
- Uses exact category matching for alert delivery.
- Centralises the category catalogue.
- Adds anonymous zero-result/search-demand records.
- Status: local validation and the Vercel preview check passed.
- Deployment blocker: a recent production database backup or restore point has
  not been confirmed.

### Security, SEO and accessibility baseline

- Schema-free batch based directly on `master`.
- Adds CSP, HSTS, anti-framing, referrer and browser-capability restrictions.
- Adds `robots.txt`, `sitemap.xml`, skip navigation and motion preferences.
- Removes third-party runtime font requests and misleading daily-listing copy.
- No production data, provider credentials or integrations are changed.
- Local validation: 32 tests passed, ESLint passed, Prisma validation passed
  and the full Next.js production build passed.
- Local HTTP smoke testing was unavailable because separate tool processes do
  not share the preview server socket; the Vercel preview remains the required
  runtime smoke-test environment.

## Safety blockers

### Production database backup not confirmed

The GitHub scraper workflow currently runs `prisma migrate deploy` against the
production database. The repository does not document a staging database or a
pre-migration backup/restore-point check.

Do not merge or deploy schema-changing pull requests until a recent Neon
backup/restore point is confirmed. Do not run destructive or irreversible
migrations unattended.

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
