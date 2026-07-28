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

## Completed milestone: immutable URLs and candidate alerts

- Pull request #31 merged into `master` as commit
  `f8c4c941f69f6c81dfcf349998398f12a0d8320e`.
- The permanent Neon production snapshot from 28 July 2026 at 14:36:30 UTC
  remains the recorded rollback point.
- The reviewed additive migrations were applied and schema-verified by the
  protected workflow run on 28 July 2026 at 18:44 UTC.
- Vercel deployed the merge commit successfully.
- Public job browsing remains open without an account.
- Public job links now use immutable, human-readable title-and-employer slugs.
- Legacy database-key URLs return HTTP 308 to the canonical slug.
- Candidate alert preferences require authentication.
- Google OAuth and passwordless Resend providers are configured and exposed.
- Unauthenticated account access redirects to sign-in and the alert API returns
  HTTP 401.
- Google sign-in initiates successfully with PKCE and the exact production
  callback URL.
- Controlled categories, optional location, experience, work-arrangement,
  organisation and keyword preferences, consent, pause/unsubscribe controls,
  delivery logs, retries and idempotency are deployed.
- Full provider completion still requires a controlled human Google sign-in and
  a passwordless-email test to a designated test inbox. These tests must not use
  a real subscriber.

### Secure unsubscribe flow

- Replaces state-changing email-link GET requests with a confirmation page.
- Adds standards-compliant one-click POST unsubscribe headers for supporting
  email clients.
- Deployed in pull request #29 without a database migration.

### AdSense trust and transparency

- Adds public About, Contact, Editorial Policy and Terms pages.
- Adds site-wide company and legal navigation.
- Publishes the confirmed Google publisher record at `/ads.txt`.
- Keeps advertisement rendering consent-gated and separate from Apply actions.

## Remaining controlled verification

- Complete one Google sign-in with an authorised test account and confirm
  `/account/alerts` loads.
- Request one passwordless sign-in link to a designated test inbox and confirm
  the link creates a session.
- Save, reload, pause and unsubscribe a test preference, then remove or deactivate
  the test record.
- Do not use a real subscriber address. WhatsApp delivery remains unavailable
  until an official WhatsApp Business API integration is configured and tested.

## Definition-of-done evidence

Every batch must record:

- Migrations and rollback/restore assumptions.
- Test, lint, type-check and production-build results.
- Preview deployment URL and smoke-test result.
- Commit and pull-request links.
- Remaining external configuration or production blockers.
