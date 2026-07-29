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
- Public job links now use immutable position-only slugs, adding an employer or
  short stable suffix only for genuine title collisions.
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
- Controlled Google and passwordless-email sign-in, preference management and
  unsubscribe checks were confirmed on 28 July 2026.

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

## Remaining external integration boundary

- WhatsApp delivery remains unavailable until an official WhatsApp Business API
  integration is configured and tested. No unverified channel is shown as an
  active alert option.

## Current professional experience release

- Position-only public URLs are implemented by default, with an employer or
  short stable suffix used only when two live records would otherwise collide.
- The previous readable URL format remains resolvable and permanently redirects
  to the cleaner canonical URL.
- Alert preference forms clear after a successful save and show a durable,
  accessible confirmation summary.
- Missing candidate fields can be submitted as matching keywords and aggregated
  demand signals without fragmenting the controlled category catalogue.
- Creative, Design & Media, Construction & Real Estate, and Security &
  Protective Services are now classified automatically.
- Pull request #35 and workflow run #30392729901 normalized production slugs,
  verified uniqueness and preserved permanent redirects from previous URLs.

## Current release: lifecycle and source-health observability

- Expired vacancies are archived globally even when an individual source is
  temporarily unavailable.
- Every scraper run emits a machine-readable health report with per-source
  counts, timings, lifecycle changes, delivery totals and sanitized failures.
- Individual official vacancy links that cannot be resolved are recorded as
  degraded-source warnings without discarding other verified vacancies.
- GitHub Actions shows the same health information in the run summary and keeps
  the JSON evidence for 30 days, including failed runs.
- This release is schema-free and does not change production access controls.

## Phase 4 release: verified employer sources

- The official Standard Bank Group SmartRecruiters API is the source of record
  for Stanbic Bank Tanzania vacancies.
- Only active postings whose official country code is Tanzania are imported.
- Every imported vacancy keeps its complete official description and exact
  `jobs.smartrecruiters.com` application destination.
- Existing matching AjiraWeb records are promoted to the official source
  identity instead of being duplicated.
- A valid empty Tanzania feed is treated as healthy, while HTTP and malformed
  API failures remain visible in scraper health reporting.
- Empty aggregator cycles preserve existing verified jobs and are reported as
  degraded health warnings without failing healthy official sources.
- Live dry-run evidence on 29 July 2026 found six current Tanzania vacancies.
- This release is schema-free and requires no production migration.

## In review: secure employer and admin foundation

- Employer and administrator workspaces are protected by authenticated,
  database-backed role checks and an explicit disabled-by-default feature flag.
- Employer profiles enter a pending verification state; only administrators
  can verify, reject or suspend them.
- Vacancy moderation supports publish, reject and archive decisions, with a
  required reason for rejection.
- Verification and moderation changes are transactional and write sanitized
  audit events tied to the authenticated actor.
- Existing public and imported vacancies remain published by the additive
  migration; no current job is deleted or hidden.
- The permanent production snapshot from 29 July 2026 at 06:11:39 UTC is the
  recorded rollback point for this reviewed additive migration.

## In review: candidate career foundation

- An authenticated candidate workspace provides profile metadata, HTTPS-only
  document references, saved vacancies and application status tracking.
- Saved jobs and applications are always scoped to the signed-in database user.
- Daraja applications prevent duplicates and accept submissions only while a
  vacancy is active and open.
- Third-party vacancies preserve their direct official application destination
  instead of collecting an application on Daraja.
- Candidates may withdraw only their own pending or reviewed applications.
- The release is disabled by default with `CANDIDATE_CAREER_ENABLED`.
- The production snapshot from 29 July 2026 at 06:11:39 UTC is the recorded
  rollback point for this additive migration.

## In review: entitlements and sandbox billing foundation

- Deterministic free, employer and candidate plan limits use a safe free-plan
  fallback.
- Authenticated users can inspect their effective plan, limits and invoices.
- Invoice and usage ledgers use idempotency and integer minor units.
- Checkout is disabled unless billing, sandbox mode and the internal test
  provider are all explicitly enabled.
- The foundation cannot create a live payment or claim an external provider.
- The production snapshot from 29 July 2026 at 06:11:39 UTC is the recorded
  rollback point for this additive migration.

## Definition-of-done evidence

Every batch must record:

- Migrations and rollback/restore assumptions.
- Test, lint, type-check and production-build results.
- Preview deployment URL and smoke-test result.
- Commit and pull-request links.
- Remaining external configuration or production blockers.
