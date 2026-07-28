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
- Local validation: 50 tests, ESLint, Prisma validation and production build
  passed after updating against current `master`.
- Production recovery point confirmed: permanent Neon snapshot of the
  `production` branch created on 28 July 2026 at 14:36:30 UTC
  (17:36:30 Africa/Dar_es_Salaam), 40.35 MB, no expiry.
- The additive migration must still be applied and verified in a controlled
  step before the code is merged.

### Secure unsubscribe flow

- Replaces state-changing email-link GET requests with a confirmation page.
- Adds standards-compliant one-click POST unsubscribe headers for supporting
  email clients.
- Deployed in pull request #29 without a database migration.

### Authentication and candidate accounts

- Public job discovery will remain available without an account.
- Saving alert preferences will require an authenticated candidate account.
- Planned providers: Google OAuth and passwordless verified email.
- Production blockers: Google OAuth credentials and sandbox verification for
  transactional email.

### AdSense trust and transparency

- Adds public About, Contact, Editorial Policy and Terms pages.
- Adds site-wide company and legal navigation.
- Publishes the confirmed Google publisher record at `/ads.txt`.
- Keeps advertisement rendering consent-gated and separate from Apply actions.

## Safety blockers

### Production database recovery point confirmed

The permanent Neon snapshot above clears the recovery-point gate for this
milestone. Migration SQL must still be reviewed, applied once and verified
before schema-dependent code is merged.

### Provider credentials and sandbox verification

- `RESEND_API_KEY` and `JOB_ALERTS_FROM_EMAIL` are referenced by the workflow.
- End-to-end delivery has not been verified with a sandbox/test inbox.
- No WhatsApp Business API integration is configured; the public CTA links to
  the official Daraja WhatsApp Channel only.
- Do not send test alerts to real subscribers.

## Next safe implementation batches

1. Apply and verify the additive slug migration against the recorded snapshot.
2. Finish authenticated candidate subscriptions vertically:
   secure sessions, verification, preferences, delivery log, idempotent retry
   and account-level unsubscribe controls.
3. Deploy immutable job slugs and verify legacy redirects and canonical URLs.
4. Do not begin another product phase until this milestone is production
   smoke-tested.

## Definition-of-done evidence

Every batch must record:

- Migrations and rollback/restore assumptions.
- Test, lint, type-check and production-build results.
- Preview deployment URL and smoke-test result.
- Commit and pull-request links.
- Remaining external configuration or production blockers.
