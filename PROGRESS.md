# Daraja Jobs production-readiness progress

Last updated: 2 October 2026

## Current objective

Build Daraja into a secure Tanzania-first work marketplace through small,
tested vertical releases. The current priority is Phase 0 security and privacy
hardening before expanding candidate CV, employer, freelance, payment or AI
workflows.

## Current batch: multi-position AjiraWeb vacancy integrity

- AjiraWeb email-application articles that contain several real roles now publish each role separately instead of turning editorial group headings such as "Administrative and Technical Professional Positions – 5 Posts" into a public vacancy.
- Hyphenated employer names such as "Abdulrahman Al-Sumait University" are preserved instead of being truncated at the hyphen.
- Table-based positions and bold academic role headings are extracted as individual vacancies; group/department headings are rejected as job titles.
- Each extracted vacancy keeps the source article as provenance and gets its own verified employer email application destination with a role-specific subject.
- Narrative deadline wording such as "deadline for submitting applications is 20 October 2026" is recognised and normalised without inventing missing dates.
- Regression coverage reproduces the reported SUMAIT article structure. The focused AjiraWeb test suite passes 8/8, and a live-feed dry run resolves 12 distinct SUMAIT role titles covering the article's 19 advertised posts with the correct employer, verified application email and 20 October 2026 deadline.
- No schema, authentication, payment, DNS or credential changes are included in this batch.

## Current batch: complete shared UI polish

- The shared Daraja navigation is now a white, sticky header on desktop and
  mobile so the header connects visually with the approved light hero system.
- The DARAJA wordmark keeps the teal brand treatment while the
  "Kazi Na Fursa Tanzania" line has more separation, stronger contrast and a
  lower baseline for legibility.
- The homepage hero title uses Poppins 700 with a stronger display hierarchy.
- Public homepage, jobs discovery, job detail, shared workspace heroes, footer,
  alerts, workspace shells and shared cards now inherit one content width,
  gutter system, section rhythm, radius/elevation language and responsive
  spacing from `styles/tokens.css`.
- Custom dark public job heroes were aligned to the same light warm-white
  surface used by the homepage and shared `PageHero`, while preserving Daraja
  teal, job data, application actions and accessibility.
- Shared navigation/search controls were retuned for the light header and the
  desktop navigation now stays sticky just like the mobile header.
- This batch changes visual structure only. Routes, permissions, scraper logic,
  database state, authentication, application destinations and job lifecycle
  rules are unchanged.

## Current batch: global Poppins, mobile bridge and compact consent

- Poppins now owns the shared `--font-daraja` token in the root layout, so
  public pages, protected workspaces, navigation, forms, buttons, filters and
  shared components inherit one typography system rather than page-specific
  font changes.
- The Daraja bridge animation is responsive instead of desktop-only. Tablet and
  mobile use a compact scaled composition with smaller category cards and labels
  while keeping the same CSS-only bridge/traveller sequence and reduced-motion
  behavior.
- Privacy consent now reads the saved choice before rendering, eliminating the
  reload/page-transition flash that made the prompt appear repeatedly.
- Accepted or declined consent is stored in both local storage and a one-year
  first-party cookie shared by `ajira.daraja.co.tz` and its `www` host.
- The consent prompt is now a compact global toast above the mobile dock with
  shorter copy and smaller Accept/Decline actions. It disappears after a choice
  and only reopens through the existing privacy-settings event.
- These changes are centralized in the root layout, design tokens and shared
  components; no route, scraper, database, authentication or job lifecycle
  behavior changes.

## Current batch: mobile hero and search responsiveness

- Mobile hero spacing and headline sizing are now tuned independently from the
  desktop composition instead of relying on a scaled-down desktop layout.
- At 640px and below, the headline no longer runs the desktop word-by-word rise
  sequence; the copy enters as one subtle block so wrapped text remains stable.
- Mobile search fields and the Find jobs button use explicit 16px typography,
  preventing focus-zoom behavior in mobile browsers and keeping controls at a
  consistent 48px height.
- Search is a compact single-column card on small screens with full-width
  controls and reduced shadow/spacing.
- Desktop hero animation, bridge behavior, search semantics and reduced-motion
  support are unchanged.

## Current batch: white hero reference canvas

- The homepage hero now matches the supplied five-second reference video with a
  clean warm-white canvas instead of the photo/grey background.
- Headline and supporting copy use dark neutral text on the light canvas while
  preserving the existing teal accent and animation timing.
- The desktop bridge remains the same server-rendered decorative animation, but
  its deck, hangers, labels and category cards are retuned for the light
  reference background so contrast remains intentional.
- Mobile keeps the same light hero canvas; the bridge remains hidden at 900px
  and below as before.
- The search form, categories, hero animation sequence, reduced-motion behavior,
  favicon, scraper, schema and application flow are unchanged.

## Current batch: Homepage hero animation

- The existing homepage hero in `app/page.js` now plays a five-second,
  CSS-only entrance: eyebrow, headline words, lead, search and popular links
  stagger in, the "forward." underline draws and the Find jobs button gets one
  highlight sweep.
- `components/HomeHeroBridge.js` adds a decorative Daraja ("bridge") visual on
  desktop: the bridge draws from Talent to Opportunity, travellers cross it and
  three real category labels appear. It is server-rendered, `aria-hidden`,
  hidden at 900px and below and has no client JavaScript.
- The headline animates by transform only (no opacity) so it stays visible for
  Largest Contentful Paint; all hero animation is disabled under
  `prefers-reduced-motion: reduce`.
- The search form, categories and links are unchanged. No schema, data,
  provider, credential or feature-flag change.
- Validation is completed by the protected PR workflow before merge; the
  separate invalid `public/images/daraja-career-hero.webp` asset remains out
  of scope for this animation PR.

## Current batch: original Daraja favicon

- The browser favicon now uses the exact 48x48 PNG supplied by the project owner
  at `app/icon.png`, using Next.js file-based metadata rather than an external
  URL or starter favicon.
- No third-party domain, generated replacement or unrelated brand asset is used.
- The 1024x1024 standard/adaptive icon files supplied in the same handoff are
  intentionally not wired yet because Daraja does not currently publish a PWA
  manifest; they remain separate from this focused browser-favicon change.
- This batch changes no route, schema, data, provider, credential or feature flag.

## Current batch: Phase 0 framework security and release gate

- Next.js is upgraded from `16.2.12` to the patched `16.3.3` release and
  `eslint-config-next` is kept on the same version. This responds to the
  25 August 2026 Next.js security release covering critical advisories
  `GHSA-2xp9-vwfh-vxw4` and `GHSA-p293-qw3h-jr36`.
- The refreshed production dependency graph reports zero runtime
  vulnerabilities with `npm audit --omit=dev`; the two high-severity findings
  shown by the full development install are development-only dependencies.
- The cPanel release workflow now runs `npm audit --omit=dev --audit-level=high`
  before tests/build, so a future high or critical production dependency blocks
  release publication.
- This batch changes no database schema, production data, provider credential,
  DNS setting or feature flag.
- Production activation remains pending until the merged safe release is
  published and `/api/health/release` reports its exact commit.

## Current batch: Phase 0 protected write boundary

- Existing candidate, alert, employer and administrator write routes keep their
  current server-side authentication, ownership and role checks; no parallel or
  replacement API was created.
- A single `lib/request-security.js` owner now rejects browser cross-site
  mutations using Fetch Metadata and Origin checks, requires JSON for protected
  JSON writes, validates actual UTF-8 payload size and returns non-cacheable
  security errors.
- Protected mutations have bounded per-client in-process throttling with
  `Retry-After`. This is defense in depth for the current single cPanel runtime,
  not a replacement for a future edge/distributed rate limiter.
- Candidate profile, saved-job, Daraja application, job-alert preference,
  employer profile/vacancy and administrator moderation writes now use that
  shared request boundary.
- The standards-compliant token-based one-click alert unsubscribe POST remains
  intentionally public and separate from authenticated JSON preference writes.
- This batch is schema-free and changes no production data, DNS, provider,
  payment, feature flag or credential.
- Pull request #84 passed cPanel PR workflow #33161209301 on 28 August 2026:
  tests, ESLint, Prisma schema validation, shell validation and the production
  build all completed successfully. Publishing/deployment steps were correctly
  skipped for the pull request.

## Current batch: Phase 0 authentication and session boundary

- Auth.js with the Prisma adapter remains the single authentication owner; no
  parallel authentication stack or replacement route was introduced.
- Database sessions now have an explicit seven-day maximum lifetime and a
  one-day update cadence instead of relying on implicit defaults.
- Auth.js POST operations pass through the shared protected-mutation boundary,
  while OAuth and passwordless-email GET callbacks remain handled by Auth.js.
- Mutation Origin validation no longer trusts forwarded-host headers. Accepted
  origins are derived from the actual request URL plus configured canonical
  `AUTH_URL`/`NEXTAUTH_URL` origins when present.
- This batch is schema-free and changes no provider credentials, production
  data, DNS, payment configuration or feature flag.
- Pull request #85 passed cPanel PR workflow #33161733478 on 28 August 2026:
  tests, ESLint, Prisma schema validation, shell validation, the production
  build, packaging and artifact upload all completed successfully. Release
  publication and cPanel handoff were correctly skipped for the pull request.

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

## Completed foundation: WhatsApp Business sandbox guardrails

- A template-only Meta WhatsApp Business Cloud API transport is implemented but
  remains disconnected from subscriber delivery and disabled by default.
- The transport requires the official access token, phone-number ID, explicit
  Graph API version, approved template and exact allowlisted test recipient.
- No request can be made until separate bounded send and delivery-status webhook
  evidence IDs plus a verification timestamp from the last 30 days record an
  end-to-end sandbox result.
- Arbitrary recipients, free-form message bodies, malformed template values and
  unsanitized provider failures are rejected deterministically.
- Tests use only a mock HTTP client, fake credentials and a reserved test number;
  no real subscriber contact or WhatsApp recipient is used.
- Official credentials, a verified Meta test recipient and retained end-to-end
  sandbox plus webhook-status evidence remain external gates. No WhatsApp
  publishing or alert delivery is claimed live.
- This batch is schema-free, changes no production flag and leaves public job
  browsing unchanged.
- The August 2 draft has been rebuilt from current `master`; subscriber delivery
  remains deliberately disconnected while official credentials and current
  end-to-end sandbox evidence are absent.
- Validation completed on 27 August 2026: all 127 tests, ESLint, Prisma schema
  validation and the production build passed. The runtime dependency audit
  reports zero vulnerabilities after overriding the newly disclosed vulnerable
  `deepmerge-ts` and `nanoid` transitive releases.
- This batch has no schema migration. Its transport remains a sandbox-only
  library with no public route, scheduled job or subscriber-delivery caller.
- Pull request #73 passed Vercel and cPanel release workflow #33040764228. The
  protected Vercel preview deployed successfully and correctly redirected an
  unauthenticated smoke request to Vercel SSO.
- Pull request #73 merged into `master` as commit
  `5e530e0671f76fdb4f7a40916ed10aa33670d65c`. Its verified cPanel release was
  published without enabling delivery or changing production flags.

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

## Completed: secure employer and admin foundation

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
- Pull request #42 deployed the reviewed migration. Anonymous vacancy creation
  has since been removed: profile and vacancy submissions now require an
  authenticated employer account, use the server-owned employer identity and
  accept only controlled job categories and employment types.
- The permanent production snapshot from 29 July 2026 at 06:11:39 UTC is the
  recorded rollback point for this reviewed additive migration.

## Completed: candidate career foundation

- An authenticated candidate workspace provides profile metadata, HTTPS-only
  document references, saved vacancies and application status tracking.
- Saved jobs and applications are always scoped to the signed-in database user.
- Daraja applications prevent duplicates and accept submissions only while a
  vacancy is active and open.
- Third-party vacancies preserve their direct official application destination
  instead of collecting an application on Daraja.
- Candidates may withdraw only their own pending or reviewed applications.
- The release is disabled by default with `CANDIDATE_CAREER_ENABLED`.
- Pull request #43 deployed the reviewed candidate career migration and
  protected workspace.
- The production snapshot from 29 July 2026 at 06:11:39 UTC is the recorded
  rollback point for this additive migration.

## Completed: controlled classification quality

- Every source run reports its controlled category distribution and the number
  of low-confidence vacancies requiring review.
- Title matches remain authoritative; employer and description context are used
  only when the role title is not decisive.
- Assisted suggestions can only select an existing controlled category, require
  at least 90% confidence and cannot override a deterministic role match.
- Review evidence is bounded and excludes job descriptions and credentials.
- No external AI service is enabled or claimed by this schema-free foundation.
- Pull request #48 merged into `master`; its complete cPanel release bundle
  passed tests, ESLint, Prisma validation and the production build.
- This schema-free release requires no production database migration.

## Completed foundation: AdSense and Core Web Vitals readiness

- Google Consent Mode defaults analytics, advertising, user-data and
  personalisation storage to denied until the visitor explicitly accepts.
- Core Web Vitals are reported to the configured GA4 property only after
  consent, using bounded metric identifiers and no candidate data.
- AdSense remains disabled unless both the publisher ID and a complete numeric
  slot ID are configured.
- The single job-list placement is clearly labelled, separated from Apply
  actions and reserves responsive space to reduce layout shift.
- Google account approval and creation of the production ad slot remain
  external gates; no advertisement is claimed live before those gates pass.
- This batch is schema-free and does not require a production migration.
- Pull request #49 merged after 94 tests, ESLint, Prisma validation and the
  production build passed. Activating its verified cPanel bundle remains a
  hosting-operation gate; Google approval and a numeric ad slot remain external
  account gates.

## Final release: public-surface security and quality audit

- Public job discovery is read-only; vacancy creation is available only through
  the authenticated employer workspace.
- Employer profile and vacancy forms use accessible status feedback, controlled
  values and server-owned organisation identity.
- Production framework, database client and HTTP/WebSocket dependencies are
  updated to supported patched releases.
- This batch is schema-free and requires no production migration.
- Pull request #52 contains the focused release. Its recovered source tree was
  verified byte-for-byte before publication.
- All 98 tests, ESLint, Prisma validation and the production build passed on
  2 August 2026; the runtime dependency audit reports zero vulnerabilities.
- Merge and production deployment remain gated on required GitHub checks and a
  post-deployment smoke test.

## Current batch: idempotent NMB source identity

- NMB records use the canonical `nmb-bank-careers` source identity while still
  discovering and upgrading records created under the legacy `nmb-bank` alias.
- A concurrent source-identity insert is recovered as an idempotent update
  after the initial lookup, without weakening database uniqueness.
- The batch is schema-free and does not delete or migrate production records.
- Regression coverage exercises both legacy-source reconciliation and
  concurrent unique-identity recovery.

## Current batch: permanent cPanel deployment recovery

- Production database credentials were rotated and the reviewed additive
  candidate milestone migrations were applied to the `daraja` database after
  creating the non-expiring Neon snapshot
  `pre-job-slug-migration-2026-08-09`.
- Public pages and the jobs API return HTTP 200 with valid job data, and three
  consecutive scraper runs completed successfully after the repair.
- The deployment script now detects when its commit marker disagrees with the
  installed Next.js bundle, handles CloudLinux activation safely and validates
  the real jobs API before recording success.
- A misplaced application-local `node_modules` directory is preserved with a
  timestamp and replaced by CloudLinux's required virtual-environment symlink;
  no dependency directory is deleted.
- Failed releases restore the prior build, public assets and startup file.
- The release workflow publishes the deploy runner with its own checksum,
  installs that verified runner over fingerprint-authenticated SSH and then
  activates the release. This closes the stale-server-script bootstrap gap
  without storing a GitHub token on cPanel.
- This batch is schema-free and never runs a Prisma migration or database push.
- Validation completed on 9 August 2026: 108 tests, ESLint, Prisma schema
  validation, workflow YAML parsing, shell syntax validation and the production
  build passed; the runtime dependency audit reports zero vulnerabilities.

## Current batch: feature-aware employer entry points

- Public navigation, homepage calls to action and the sitemap advertise the
  employer workspace only when `EMPLOYER_PORTAL_ENABLED` is active.
- Employer, administrator, vacancy-submission and candidate workspaces evaluate
  their feature flags at request time instead of freezing disabled CI values
  into the release bundle.
- Disabled employer and administrator routes continue to return not found, and
  all existing authentication, role and verification checks remain unchanged.
- Candidate job browsing, account navigation and direct source applications
  remain public or protected exactly as before.
- The feature flag is evaluated on the server without exposing configuration to
  the browser or adding a database dependency to public metadata generation.
- This batch is schema-free and requires no production migration.
- It supersedes the stale runtime-feature-flags draft in pull request #56.
- Validation completed on 10 August 2026: all 110 tests, ESLint, Prisma
  validation and the production build passed; the runtime dependency audit
  reports zero vulnerabilities.

## Current batch: safe Ajira title reconciliation

- Rendered Ajira vacancy URLs are decoded back to the stable numeric vacancy
  identity so corrected titles update existing records instead of creating
  parallel jobs.
- Generic application and navigation labels are archived reversibly by setting
  `active=false`; records are never deleted.
- Retired financial-institution crawler rows are archived only when the stored
  title exactly matches the stored employer. Legitimate role titles ending in
  words such as âBankâ are explicitly preserved.
- The live jobs API returns valid job JSON, resolving the original production
  gate. Activating this cleanup still depends on the verified cPanel release.
- This batch contains no schema migration or record deletion.
- Validation completed on 10 August 2026: all 113 tests, ESLint, Prisma
  validation and the production build passed; the runtime dependency audit
  reports zero vulnerabilities.

## Current batch: Next.js-aware cPanel release verification

- The cPanel deployer no longer assumes that Next.js publishes the legacy
  `/_next/static/<BUILD_ID>/_buildManifest.js` path. That false assumption
  caused the healthy 10 August release to be rolled back after five HTTP 404s.
- Release verification now loads the deployed homepage, selects a same-origin
  JavaScript file actually referenced under `/_next/static/`, and requires a
  non-empty response with a JavaScript MIME type.
- The public jobs page and structured jobs API checks remain mandatory, and any
  failed check still restores the previous frontend atomically.
- The asset-selection guard cannot follow third-party script URLs.
- This batch is schema-free and does not run or require a database migration.
- Validation completed on 10 August 2026: all 113 tests, ESLint, Prisma schema
  validation, shell syntax validation and the production build passed. The
  replacement check also selected and validated a live same-origin Next.js
  asset with the `application/javascript` MIME type.

## Current batch: bounded stale-worker deployment recovery

- The deployed release is verified against a JavaScript asset referenced by the
  installed homepage artifact, so an older but otherwise healthy frontend can
  no longer satisfy the release gate.
- Matching commit markers are revalidated against production instead of
  bypassing health checks on later deployment runs.
- A mismatched frontend first receives an application-scoped CloudLinux
  stop/start cycle and the documented Passenger restart signal.
- LiteSpeed `lsnode` cleanup is attempted only when exactly one Node application
  is registered for the cPanel account; multiple or unknown applications fail
  closed instead of receiving an account-wide process signal.
- The public homepage, jobs page and structured jobs API were independently
  verified after the 11 August 2026 manual stale-worker recovery. The new search  navigation is live and disabled employer entry points remain hidden.
- This batch is schema-free, runs no Prisma migration or database push and
  preserves the existing atomic frontend rollback.
- Validation completed on 11 August 2026: all 115 tests, ESLint, Prisma schema
  validation, shell syntax validation and the production build passed. The
  release-specific asset set selects the homepage route chunk rather than a
  shared vendor chunk.

## Current batch: exact production release observability

- A public, read-only release-health endpoint reports only the full Git commit
  recorded inside the installed Next.js bundle.
- Missing, shortened or malformed markers fail closed with HTTP 503 and never
  expose filesystem paths, environment values, credentials or database state.
- Responses are dynamic and explicitly non-cacheable so hosting and CDN caches
  cannot make an older worker appear current.
- The cPanel deployer requires the reported commit to exactly equal the signed
  release marker before recording deployment success, in addition to the
  existing frontend-asset, jobs-page and structured jobs-API checks.
- Public job browsing remains open. This schema-free batch runs no migration or
  database push and changes no feature flag, access control or subscriber data.
- Validation completed on 11 August 2026: all 118 tests, ESLint, Prisma schema
  validation, shell syntax validation and the production build passed; the
  runtime dependency audit reports zero vulnerabilities.

## Completed: closed-vacancy lifecycle and guarded Apply destinations

- Open job queries now require vacancies to be active, published and not past
  their deadline; Expired and All views remain restricted to published records.
- Successful non-empty snapshots from Ajira, AjiraWeb, NMB and Standard Bank
  archive source records that disappeared by setting `active=false`. Empty or
  malformed snapshots fail safe and never mass-archive existing vacancies.
- Job-detail responses preserve direct email applications and route external
  HTTP applications through a dedicated no-store redirect endpoint.
- Server-side application-page resolution is restricted to exact source-owned
  HTTPS hosts, validates every redirect before following it, rejects credential
  URLs and IP literals, and caps HTML responses at one megabyte. Other verified
  destinations open in the candidate browser without turning Daraja into an
  unrestricted proxy.
- Known ATS recognition uses exact hostname boundaries so lookalike domains
  cannot inherit trusted direct-application handling.
- This batch is schema-free, deletes no records, changes no credentials and
  sends no message or payment. Public job browsing remains open.
- Validation completed on 27 August 2026: all 139 tests, ESLint, Prisma schema
  validation and the production build passed; the runtime dependency audit
  reports zero vulnerabilities.
- Pull request #75 merged the source lifecycle release into `master` as commit
  `55fbfe2f19a2c97f66cae12aa81614f9d854f557`.
- Pull request #76 merged the focused resolver hardening as commit
  `98e43c7620f8ae868cc53daeae513f1301c36ad9` after its protected preview and
  validation workflow passed.
- Pull request #77 connected the visible job-detail Apply action to the guarded
  final-destination resolver and merged as commit
  `5956dcb322654adb21ce51000dc46d41af294765`.
- Pull request #78 separated malformed location labels from embedded deadline
  metadata and merged as commit `5c4c9909c3c6c1e8ea449ce77494fc230bd2eba4`.

## Current batch: canonical public search and shared categories

- The global navigation and jobs results page now share one canonical
  `search` query parameter, so a submitted title or employer reaches the API
  filter instead of silently showing every vacancy.
- Existing links that used the former `q` parameter remain compatible and are
  normalized to the canonical URL without losing the search term.
- Search terms, page numbers, statuses and categories are normalized and
  bounded before becoming browser history state.
- The public category filter uses the same controlled catalogue as candidate
  preferences and employer vacancy forms, including Creative, Construction and
  Security roles added by the classification release.
- This batch is schema-free, preserves anonymous job browsing and changes no
  feature flag, payment, message delivery or subscriber record.
- Validation completed on 27 August 2026: all 146 tests, ESLint, Prisma schema
  validation and the production build passed; the runtime dependency audit
  reports zero vulnerabilities.
- Pull request #79 passed Vercel and cPanel release workflow #33064566841. The
  protected `/jobs?search=data` preview returned the expected HTTP 302 Vercel
  SSO redirect with private, noindex response headers.
- Production activation remains a cPanel hosting-operation gate. This release
  does not require or authorize a database migration.

## Current batch: verified outbound cPanel release handoff

- The cPanel workflow contract now tests the outbound pull deployment path
  instead of requiring the retired inbound SSH action and hosting secrets.
- Every published release contains checksummed deployment and auto-deployment
  runners, and CI validates both scripts before publishing any artifact.
- The cPanel pull runner uses an exclusive lock, bounded downloads and a private
  temporary directory, then verifies the deploy-runner checksum and shell syntax
  before installing or executing it.
- Compatibility with the hosting account's older curl is protected by a test;
  unsupported `--retry-all-errors` flags cannot silently return to this path.
- The release workflow never receives cPanel SSH credentials. The production
  account only makes an outbound HTTPS request to the public verified release.
- This batch is schema-free, runs no Prisma migration or database push, and does
  not change payments, messages, access controls or public job browsing.
- Validation completed on 27 August 2026: all 147 tests, ESLint, Prisma schema
  validation, shell syntax validation and the production build passed; the
  runtime dependency audit reports zero vulnerabilities.
- Production release health reported commit
  `f2c9ded54fc94412cf7f3dbd2759cdc944ef19fa` before this CI repair. The batch
  is not considered live until the exact merged release is reported publicly.

## Current batch: privileged admin mutation boundary

- The two current consequential administrator write routes retain their
  database-backed `ADMIN` role checks and transactional audit events.
- Employer verification and vacancy moderation now require an explicit browser
  `Origin` matching Daraja's request or configured canonical Auth.js origin;
  missing or cross-site origins fail closed.
- Privileged moderation writes use a 20-per-minute in-process abuse budget keyed
  to the server-derived authenticated administrator ID, so protection does not
  depend on proxy IP headers being present. Ordinary protected routes keep the
  existing client-IP defense-in-depth behavior.
- Admin mutation payloads remain JSON-only and capped at 4 KB.
- This batch is schema-free and changes no production data automatically,
  provider configuration, credentials, DNS, payment behavior or feature flag.
- Validation completed on 29 August 2026: all 171 tests, the production
  dependency audit, ESLint, Prisma validation, cPanel shell validation,
  production build, packaging and Vercel passed on pull request #96.
- Production activation remains pending until the merged release is published
  and `/api/health/release` reports the exact merge commit.

## Definition-of-done evidence

Every batch must record:

- Migrations and rollback/restore assumptions.
- Test, lint, type-check and production-build results.
- Preview deployment URL and smoke-test result.
- Commit and pull-request links.
- Remaining external configuration or production blockers.

## Current batch: October 2026 runtime security refresh

- The existing cPanel runtime-audit release gate blocked pull request #97 before
  UI validation after newly published September 2026 advisories entered the
  installed production dependency graph. The audit gate was preserved and the
  UI release was paused rather than bypassing the failure.
- Next.js is updated from 16.3.3 to 16.3.6, which is the patched 16.3.x release
  for the critical `next/og` ImageResponse advisory surfaced by the gate.
- Axios resolves to 1.20.0, sharp to 0.35.4, fast-uri to 3.1.8, undici to
  7.29.1, and mysql2 to 3.23.1. These versions clear the high/critical runtime
  advisories present in the prior lockfile.
- The dependency refresh changes no database schema, production data, provider
  credentials, DNS, feature flags or application business logic.
- Pull request #98 passed the runtime production dependency audit, full tests,
  ESLint, Prisma validation, cPanel shell validation, production build,
  packaging and Vercel preview on 1 October 2026.
- Production activation remains pending until the merged master release is
  published and cPanel reports its exact merge commit through
  `/api/health/release`.


## Current batch: complete Jobtex-inspired UI rollup

- The remaining public and protected web surfaces now use one Daraja-owned,
  Jobtex-inspired visual language instead of a mix of legacy page treatments.
- Public job detail now uses an opportunity summary, job overview, position
  description, guarded application action and related-category navigation while
  preserving the existing application resolver and current share behavior.
- Candidate Career, Job Alerts and Privacy & Data pages now share a consistent
  account workspace treatment. Candidate-document upload remains disabled until
  malware scanning is verified under issue #93.
- The shared JobAlerts section now uses an explicit CSS module rather than
  component-local styled-jsx, closing the styling reliability concern raised
  during UI QA.
- Employer workspace, vacancy submission and protected admin moderation now use
  a consistent portal layout while preserving all server-side verification,
  ownership, ADMIN and audit boundaries.
- Candidate sign-in and one-time email verification now share the public Daraja
  navigation and the same authentication visual system without changing Auth.js
  provider or safe-callback behavior.
- Decision D-024 records that licensed templates inform flow and interaction
  patterns but never replace Daraja brand, architecture, security or business
  logic.
- This rollup is schema-free and changes no production data, provider
  configuration, credentials, billing, payment or message-delivery state.
- Pull request #108 passed Vercel and cPanel PR workflow #36898051093,
  including the production dependency audit, full tests, ESLint, Prisma
  validation, production build, standalone-runtime smoke test and package
  creation. Publication and cPanel handoff were correctly skipped on the PR.
- Performance work remains intentionally separate: initial jobs SSR/cache,
  Neon query/index review, host-level recaptcha behavior and production
  resource verification remain Gate B in issue #103.
- Production activation and exact live-release verification remain pending until
  the merged master release is published and
  `/api/health/release` reports the exact merged commit.


## Current batch: server-rendered initial jobs

- The public `/jobs` route now reads its first 20 vacancies directly in the
  Server Component and sends those results in the initial HTML instead of
  waiting for browser hydration and a second `/api/jobs` request.
- One shared `lib/public-jobs.js` read model now owns the Prisma
  `findMany` plus `count` query for both the Server Component and the public
  jobs API, removing duplicate query construction.
- The existing client listing hydrates from the server result, skips its first
  API fetch and keeps the existing API for subsequent search, filter and
  pagination interactions.- Canonical job-search URL normalisation remains intact, including legacy
  `q` links, without forcing a duplicate initial database read.
- This slice changes no schema, index, lifecycle rule, moderation boundary,
  provider configuration or production data. Caching and index work remain
  separately reviewable performance steps.
- Pull request #109 passed Vercel and cPanel PR workflow #36899304601 on the
  code head, including runtime audit, full tests, ESLint, Prisma validation,
  production build, standalone-runtime smoke test and packaging. The final
  docs-only head must retain the same checks before merge.


## Current batch: centralized Daraja UI system

- Daraja now has one design-token source at `styles/tokens.css`, including
  Poppins typography, brand colours, spacing, radii, shared content widths and
  workspace sizing.
- Repeated protected-area UI is centralized in `components/ui/` through
  `PageHero`, `WorkspaceShell`, `SurfaceCard` and `WorkspaceTabs`.
- Candidate Career, Alerts and Privacy pages consume the same shared hero and
  workspace shell.
- Employer, vacancy submission and protected admin pages consume the same hero,
  shell, card and tab primitives.
- Candidate sign-in and email verification reuse the shared hero and surface
  card while retaining their existing Auth.js provider and callback behaviour.
- Candidate and employer tab wrappers now share one tab implementation instead
  of two duplicated CSS modules.
- Page-specific CSS was reduced to workflow-specific content styling; shared
  brand/layout values now come from tokens.
- This is a schema-free refactor. No route, API, provider, permission,
  authentication, database or production-data behaviour changes.


## Current batch: mobile bottom navigation and template reference map

- The Jobko mobile template and Jobi dashboard template were reviewed as
  interaction references alongside Jobtex.
- `docs/UI_REFERENCE_MAP.md` now records which patterns Daraja adopts,
  defers or rejects.
- A shared `components/ui/MobileDock` provides the public/candidate mobile
  navigation using Home, Jobs, Alerts and More.
- Secondary destinations live in the More sheet rather than crowding the dock.
- The dock is rendered from the root layout, uses the centralized Daraja tokens,
  respects iPhone safe-area insets and does not use gradients or template fonts.
- Public/candidate mobile routes no longer need the duplicate hamburger
  navigation while the dock is active.
- Employer, admin, post-job and authentication routes keep their existing
  navigation until dedicated role-specific mobile navigation is approved.
- This batch changes no route ownership, database state, permissions,
  authentication, provider configuration or business logic.


## Current batch: candidate profile and notification readiness

- A real authenticated `/account/profile` page now edits the existing private
  candidate profile through `/api/candidate/profile`.
- Candidate profile selection/form ownership is centralized in
  `lib/candidate-profile.js`.
- A dedicated authenticated `/account/notifications` route is ready as the
  in-app notification centre.
- The notification centre intentionally shows no fabricated unread state while
  no persisted notification model exists. It surfaces current profile and job
  alert readiness using real account data.
- The mobile dock now has separate Home, Jobs, Updates (bell), Profile and More
  destinations when candidate career tools are enabled.
- The dock already accepts a future unread count and has badge styling ready,
  but renders no badge until a real count is supplied.
- Job Alerts moved into the More sheet so email alert preferences stay distinct
  from in-app notifications.
- Candidate account tabs now include Profile and Notifications alongside Career,
  Job Alerts and Privacy.
- No schema migration or production-data mutation is included in this batch.


## Current batch: top-right mobile account actions

- Candidate Notifications and Profile no longer occupy bottom-dock slots.
- The mobile header now owns two icon-only account actions at the top-right:
  bell → `/account/notifications`, user → `/account/profile`.
- The bottom dock returns to navigation-only ownership: Home, Jobs,
  Internships and More.
- Future unread-count support remains on the bell but no badge is rendered
  unless a real count is supplied.
- The user/profile icon remains feature-gated by the existing candidate career
  flag.
- No route, schema, permission, authentication or production-data change is
  included.

## Current batch: short public jobs cache

- The existing `lib/public-jobs.js` read model remains the single owner for
  public jobs list reads used by both the server-rendered `/jobs` page and
  `/api/jobs`.
- Repeated public job reads now use a narrowly scoped 30-second Next.js data
  cache instead of repeating the same Prisma `findMany` plus `count` work on
  every request.
- Existing published/active/deadline filtering remains authoritative inside the
  cached read; no job lifecycle or moderation rule changes.
- Administrator publish/reject/archive mutations revalidate the public-jobs
  cache tag so moderation does not wait for the ordinary short cache window.
- The change does not enable Cache Components globally, add a database index,
  change schema, mutate production data or alter authentication/permissions.
- Validation and production activation remain pending until the focused pull
  request passes the normal protected checks and the exact merged release is
  verified live.


## Current batch: mobile web shell and jobs discovery redesign

- The public/candidate mobile header is now sticky so Daraja branding and
  account actions remain available while content scrolls.
- The shared floating mobile dock is smaller and lighter, with page clearance
  adjusted so it does not dominate or cover primary content.
- Privacy consent no longer leaves a permanent floating control after the user
  accepts or declines optional services. The choice stays stored and the prompt
  remains hidden until the user deliberately opens Privacy choices from the
  mobile More menu.
- The public jobs page no longer renders its full filter form in the primary
  mobile page flow. Filters open on demand in a dedicated bottom sheet while
  search and job results remain immediately visible.
- Mobile job cards, hero spacing and result controls are tightened to improve
  information hierarchy without changing job data, routes, lifecycle,
  authentication or application behaviour.
- This redesign now inherits Poppins, Daraja colours, shared UI ownership and the
  existing Home / Jobs / Internships / More navigation model.
- The batch is schema-free and changes no production data, provider credentials,
  permissions, authentication or job-source logic. Production activation remains
  pending final responsive QA and the normal protected pull-request checks.


## Current batch: source/apply separation, source media and focused UI fixes

- The Opportunity Overview card no longer uses sticky positioning; it remains in
  normal layout flow on desktop and mobile.
- The mobile jobs filter opens as a viewport-centered modal with bounded margins.
  Body scroll is locked with scrollbar-width compensation so opening the filter
  does not shift page content.
- The Job model adds nullable `applicationUrl`, `companyLogo` and
  `representativeImage` fields while preserving the existing `sourceUrl` as
  the canonical source/detail page.
- Ajira, NMB, Standard Bank/SmartRecruiters and AjiraWeb ingestion now keep source
  and application destinations separate. Email applications preserve the source
  recipient and required subject without inventing message text.
- Source-page extraction can detect direct application forms, ATS destinations,
  explicit login/register-to-apply flows and same-page application forms.
- Source media extraction prefers structured/official organisation logos, then
  relevant source/job imagery. Public job cards and job detail use logo, then
  representative image, then initials as a neutral fallback.
- The job detail API exposes source/application/media separately. The Apply route
  prefers the stored application destination and keeps the existing bounded
  resolver only as a compatibility path for legacy records.
- Existing enabled-source jobs can be repaired safely by normal source refresh
  because source identities remain stable. Disabled/unknown legacy records are
  not assigned guessed application URLs or branding.
- The migration is additive and nullable only. It must not run in production
  until a fresh Neon restore point exists and deployment is explicitly approved.
- Fixture coverage includes direct application, external ATS, login-required
  application, email application, source-page application form, official logo,
  representative image and no-media fallback.
- The supplied Magnific career image is now stored locally as
  `public/images/daraja-career-hero.webp` and rendered through `next/image`.
  The homepage keeps copy/search ownership separate from the image, with a
  responsive two-column desktop composition and a bounded mobile image block.


## Current batch: shared hierarchy-first job cards

- Public job results now render through one shared `components/ui/JobCard` owner instead of keeping the listing-card hierarchy and styling embedded inside `JobsPageClient`.
- The card hierarchy is intentionally title-first, followed by employer, location, compact job attributes, closing status and posted context.
- Employer media keeps the existing source priority through `JobBrandMedia`: official logo, representative image, then initials fallback.
- Closing dates receive stronger visual treatment, including distinct soon/expired states, without competing with the job title.
- Mobile uses the same component with a compact two-column composition rather than a separate duplicate card implementation.
- The reference pattern was adapted rather than copied: no fabricated experience requirement and no decorative save/bookmark action was introduced because those card-level data/actions are not currently verified owners.
- This change is schema-free and does not alter job data, source/application destinations, authentication, permissions, filters, pagination, analytics ownership or production data.


## Current batch: compact mobile job card alignment

- Mobile job cards now use a strict three-column row alignment matching the approved reference: logo/title/save visual, company/location, then type/category/deadline.
- Right-side mobile details stay flush to the card's inner right edge instead of being pushed by left-side content.
- Long company names truncate safely so location and deadline remain aligned rather than wrapping unpredictably.
- Mobile deadline wording now uses `Deadline: <date>` with a compact calendar icon; posted-time text is hidden on mobile to reduce visual noise.
- Desktop card composition remains unchanged.
- The heart is visual-only in this UI pass; no false saved state or new saved-job mutation was introduced.
- This is a presentation-only change with no schema, authentication, permission, job-source, application-route or production-data impact.


### Mobile card follow-up: repeated employer mark
- The approved mobile job card now repeats the employer mark on the second row before the company name, matching the exact three-row composition supplied by the user.
- The second-row mark is mobile-only; desktop remains unchanged.
- Company/location and tags/deadline keep their fixed left/right grid alignment so left-side text cannot push the right-side details.


### Mobile card correction: one employer logo
- Removed the repeated mobile employer mark.
- The single logo now spans the title and company rows on the left.
- The company name sits directly under the job title.
- Job type/category start beneath the logo, while location and deadline remain anchored to the right.
- Desktop remains unchanged.


## Current batch: dynamic employer media discovery

- Employer media discovery is now centralized in the scraper pipeline instead of being hardcoded per employer.
- Existing verified media is reused from earlier jobs with the same employer, so successful discoveries improve future imports without a new schema or a static employer map.
- For non-Ajira sources, Daraja first derives likely official websites from verified source URLs and corporate email domains, then validates the employer identity before accepting any logo.
- If no official site can be derived, Daraja performs a bounded Google web-search fallback for the employer's official website, filters out social networks, job boards, ATS hosts and aggregators, verifies the employer name on the candidate site, and only then extracts official media.
- Search is capped per scraper run through `EMPLOYER_MEDIA_SEARCH_BUDGET` (default 8) so discovery cannot flood external sites or slow the hourly scraper indefinitely.
- Standard Bank/SmartRecruiters jobs still use their verified public posting page first when the API omits branding; NMB careers still falls back to NMB's official corporate site.
- Ajira preserves employer media only when the official portal exposes it. When Ajira has no employer media, the public card uses a neutral government-source glyph rather than inventing an employer logo.
- Generic UI icons, social images, unrelated stock imagery and unverified search results are never promoted to employer branding.
- This remains schema-free and keeps source/application URL behavior unchanged.

## Current batch: homepage hierarchy, live counters and navigation

- Public navigation now prioritizes Home, Jobs, Freelance and About, with Employers included when the employer portal is enabled. Internships remain discoverable inside Jobs and the mobile More sheet instead of occupying a primary navigation slot.
- The mobile Apple-style dock now uses Home, Jobs, Freelance and More.
- The homepage hero bridge now communicates the broader market mix through Private sector & Institutions, Government, and Bank & Finance.
- The former light trust strip is now a dark-mint live counter band using real active-job data: live opportunities, represented employers/institutions and active sources, plus the existing hourly refresh cadence.
- Homepage counters are read server-side through a five-minute cache and use the same active-job rules as public job results; no manual numbers are embedded.
- Contact remains a dedicated trust/support page for listing corrections, privacy and application-source questions.
- Visitor measurement remains owned by the existing analytics layer rather than adding a public, bot-inflatable page-view number to the homepage.

### Mobile bottom navigation reference refinement

- The mobile dock now follows the reviewed bottom-navigation guidance more closely: four primary tabs, 24px icons, at least 50px item height, short one-line labels and a clearer selected state.
- Active tabs use Daraja teal plus stronger label weight and a restrained icon highlight instead of boxing every navigation item.
- Freelance now has a real query-aware active state; Jobs is not left selected when the user is on the Freelance filter.
- The dock remains visually separated from page content through its existing floating glass surface, border, shadow and safe-area spacing.

### Role-aware mobile dock

- The bottom dock now adapts its third primary action to the authenticated user instead of showing the same destination to everyone.
- Guests and freelancers see Freelance; signed-in job seekers see Career when the candidate workspace is enabled; employers see Employer when the employer portal is enabled; admins see Admin.
- Home, Jobs and More remain stable anchors across roles, so the navigation does not become unpredictable.
- Role awareness comes from the authenticated server session already used by Daraja; no client-side role guessing or hardcoded email/account checks were added.

## Current batch: verified recruitment-source expansion

- Added a shared `verified-agency` scraper that can discover vacancy pages from a verified official listing page or, where the official careers UI is not server-readable, from a bounded Google search restricted to an allowlisted official ATS host.
- Search results are discovery-only. Daraja fetches the official vacancy page before publication and rejects closed pages, non-Tanzania jobs, missing required deadlines and past deadlines.
- Enabled six active Tanzania recruitment sources in this batch: Empower Tanzania, Shugulika Africa Limited, Career Options Africa Group - Tanzania, CVPeople Tanzania, Q-Sourcing Servtec Tanzania and eKazi / Exact Manpower Consulting Ltd.
- Empower, Shugulika, Career Options and eKazi use their own official listing pages. CVPeople and Q-Sourcing use bounded Google discovery only to locate vacancy URLs on their exact official Zoho Recruit hosts, then verify the official page.
- Added authoritative-snapshot handling so jobs disappearing from a healthy verified agency feed are archived without deleting history.
- Added tests for official-host restrictions, Google-result filtering, closed/expired vacancy rejection, relative expiry handling, structured JobPosting parsing and empty-cycle preservation.
- Recorded the October 2026 source audit in `docs/RECRUITMENT-SOURCE-AUDIT-2026-10.md`. Manpower Tanzania, Radar Recruitment, HR World and Reveurse remain disabled until each exposes a reliable current vacancy surface suitable for safe automation.

## Current batch: privacy-safe visitor counter

- Added a real monthly visitor counter backed by the production database; no placeholder or fabricated visitor number is shown.
- The counter records only after the visitor has accepted Daraja's optional analytics/privacy choice.
- Deduplication uses a short-lived first-party HttpOnly month marker, so no persistent visitor identifier, fingerprint or device ID is stored.
- Obvious crawler/bot user agents are excluded and the write endpoint is same-origin protected and rate-limited.
- The public homepage counter now shows the measured monthly visitor total alongside live opportunities, represented employers and active sources.
- Visitor measurement follows the Africa/Dar_es_Salaam calendar month and the privacy policy documents the behavior.

### cPanel dynamic-home release gate

- Production deployment health no longer assumes the homepage is statically prerendered to `.next/server/app/index.html`; the homepage became dynamic after live counters and role-aware navigation.
- The deploy gate now fetches the public homepage, selects a same-origin Next.js JavaScript asset, maps it to the installed runtime and byte-compares the public asset to the verified release asset before accepting the frontend.
- The exact public release marker remains mandatory, so a stale LiteSpeed worker still fails closed.
- Production Prisma migrations now run in the verified GitHub release workflow on non-PR runs before the cPanel bundle is published. The thin cPanel pull deployer remains migration-free.

## Current batch: professional recruiter-source correction

- Recruitment agencies are now discovery inputs, not public destination brands.
- Agency-discovered jobs must identify the actual hiring company/institution and a direct employer-authorized application channel before publication.
- Recruiter-only Apply buttons, unnamed-client vacancies, editorial roundup titles and non-Tanzania locations are rejected.
- Tanzania filtering now uses the vacancy's explicit location instead of broad page text, preventing Lagos/Nigeria listings from passing because another part of the page happens to mention Tanzania.
- Agency titles are normalized from editorial forms such as "Hub Manager at Jaza Energy Inc October 2026" into Daraja fields: Position = Hub Manager, Company = Jaza Energy Inc.
- Recruiter logos/images are discarded at ingestion; Daraja's employer-media enrichment may then resolve the real company's official media. If none is verified, the Daraja placeholder remains.
- The public job detail overview now follows the fixed professional format: Position, Company / Institution, Location, Category, Job type and Deadline. Recruiter/source branding and the old source link are no longer shown there.
- Healthy agency snapshots that contain zero publishable jobs may now archive stale recruiter-sourced listings, while genuine source failures still preserve existing records.
- The homepage is explicitly force-dynamic so the current release UI is not served from stale static HTML, mobile counters are more legible, and Talent / Opportunity labels have protected mobile spacing below the bridge.

### Production-origin and scraper identity follow-up

- Production release verification now treats `https://ajira.daraja.co.tz` as the primary user-facing origin and also verifies the `www` alias release marker before recording deployment success.
- Site metadata now uses the same user-facing origin so canonical URLs match what mobile visitors actually open.
- Standard Bank / legacy-source reconciliation now checks the exact `source + sourceId` identity before cross-source title matching, preventing a duplicate unique-key update from degrading the full scraper run.

## Current batch: stated job facts on the list card

- The scraper normalizer (`scraper/lib/jobs.js`) is now the single owner of employment-type mapping; the three duplicate adapter mappers were removed.
- Employment type, experience and number of openings are stored only when the vacancy states them. Missing values stay null instead of defaulting to Full-time, and a vacancy with no stated employer is dropped instead of being labelled "Government of Tanzania" (the Ajira adapter still sets its own institution).
- Experience is extracted from English and Swahili wording, including number words and "minimum/usiopungua" (open-ended) phrasing. Deadlines now parse Swahili months and long-form English dates.
- Migration `20261004120000_job_card_stated_facts` adds nullable `experienceMinYears`, `experienceMaxYears`, `openings` and makes `Job.type` nullable. Additive; existing rows are unchanged until their next source refresh.
- The job card shows stated facts as chips (experience, job type, openings when more than one, salary when stated) and hides any chip without data. The category chip moved off the card; category remains in filters, alerts and the detail page.
- Closing dates count calendar days in East Africa: "Closes today", "Closes tomorrow", "Closes in N days" within a week, otherwise "Deadline: <date>". Cards with no deadline show the posted date in that slot on mobile.
- Tests: `npm test` 263/263 passing (Prisma client stubbed locally because engine binaries could not be downloaded in the build sandbox), ESLint clean on changed files. Not yet verified: `next build`, migration against a database, visual check on device.
- Next planned steps: scraped-job review gate, cross-source duplicate merge, fee/scam blocking, learned source trust.

## Current batch: scraped-job trust gate

- `scraper/lib/job-policy.js` is the single owner of the ingestion publication decision: fee blocking, review signals, source auto-publish approval and source precedence.
- Vacancies asking candidates to pay (English and Swahili wording, including mobile-money instructions) are stored as REJECTED with the matched wording. Fee disclaimers ("no application fee", "hakuna ada ya maombi") and job duties mentioning fees are not blocked.
- Sources must carry `publishPolicy.autoPublish: true` in the catalog to publish automatically. All ten currently enabled sources were given it, so live publishing is unchanged; any newly enabled source starts in review.
- Messaging-app-only applications (WhatsApp/Telegram links) go to review.
- Cross-source duplicates (same position, employer and closing day) are stored once; the higher-precedence source becomes canonical. This generalizes the previous hardcoded Standard Bank/AjiraWeb pairing, which remains only as a legacy identity alias.
- Scraper refreshes never overwrite an administrator's moderation decision; a newly detected fee request does reject an automatically published record.
- `/admin` now lists up to 50 PENDING_REVIEW vacancies with Publish and Reject (reason required) actions using the existing audited moderation route. The page remains behind `EMPLOYER_PORTAL_ENABLED` and the ADMIN role.
- The scraper health summary reports held-for-review, blocked and merged-duplicate counts per source.
- Tests: `npm test` 275/275 passing (Prisma client stubbed in the sandbox), ESLint clean on changed files. No schema change in this batch.

## Current batch: employer-page verification for recruiter vacancies

- Found in production: a Jaza Energy "Hub Manager" vacancy showed the recruiter's location (Dar es Salaam) instead of the employer's (Mwanza), no contract type or experience, category "Health" (from the phrase "financial health"), and an Apply link that opened a blank applicant page.
- Recruiter-discovered vacancies now open the employer application link (`inspectEmployerPage`), rendering JavaScript applicant systems with Playwright when static HTML is empty. Employer-stated location, employment type, experience and deadline outrank the recruiter's copy; closed employer pages stop the import; links that do not show the vacancy hold it for review.
- Automatically managed records now follow the latest evidence: held for review when a problem appears, re-published when it clears. Administrator decisions are never overwritten.
- Categorization checks title, then employer name, then requires the strongest description rule to match at least twice, so a single passing word no longer decides a sector.
- Tests: `npm test` 282/282 (Prisma client stubbed in the sandbox), ESLint clean. Rendering itself is exercised in the scheduled scraper workflow, which installs Chromium.

## Current batch: Apply goes straight to the employer application

- Recruiter vacancies now store the employer's own apply, login or registration page as the Apply destination when that page opens, instead of the employer's vacancy description page. Blank apply links fall back to the employer vacancy page; a vacancy page that contains the application form stays the destination.
- The shared renderer now returns rendered HTML as well as text so apply links on JavaScript applicant systems can be found.
- Tests: `npm test` 285/285 (Prisma client stubbed in the sandbox), ESLint clean.


## Current batch: footer-owned live platform insights

- The homepage no longer uses a separate counter/trust strip between the hero and content.
- Live opportunities, represented employers/institutions, verified active sources and the privacy-safe monthly visitor count now appear together in the homepage footer, where platform context and visitor insight belong.
- The insight area uses Daraja navy `#1b2a3f` and preserves the existing Poppins typography, Daraja colours and brand system; licensed template styling is not imported.
- Visitor measurement, consent gating, bot exclusion, monthly deduplication and the existing database-backed counter remain unchanged.
- Other pages keep the existing footer without querying or fabricating homepage metrics; the live insight block is rendered only when real stats are supplied by the homepage.
- Schema, authentication, analytics consent, production data and visitor-storage behavior are unchanged.
- Pull request #149 validation passed on 4 October 2026: 285/285 tests, runtime production dependency audit, ESLint, Prisma validation, production build, self-contained cPanel runtime smoke, packaging and Vercel all completed successfully.
## Current batch: deepest Apply destination for every source and structured job descriptions

- Every source's application link is now followed (up to two hops, rendering JavaScript pages when needed) to the page where the application starts: an apply form, sign-in or registration page. Links already pointing at application systems (Ajira Portal login, ATS hosts, apply/login URLs) are kept; blank destinations are never used.
- `lib/job-description.js` regroups source text into professional sections (Role summary, What you'll do, What you need, Nice to have, What we offer, About the employer, How to apply) using English and Swahili headings, splits glued sentences and list items, and removes repeated lines. It never adds content; text with no headings stays as "About the role".
- The job detail page renders those sections and lists experience and number of openings when stated.
- Tests: `npm test` 289/289 (Prisma client stubbed in the sandbox), ESLint clean.

## Current batch: recruiter descriptions keep their structure

- Recruiter vacancy descriptions (JSON-LD and page HTML) now keep their headings and line breaks instead of being flattened into one paragraph, so the structured job-page sections from #150 have headings to work with.
- When the employer's own vacancy page has a fuller description than the recruiter's excerpt, the employer's description is stored.
- Tests: `npm test` 290/290 (Prisma client stubbed in the sandbox), ESLint clean.


## Current batch: sitewide UI ownership and code cleanup

- Public traffic numbers are now owned by the shared footer instead of being passed only from the homepage. The footer reads aggregate monthly metrics from the existing first-party visitor endpoint, so Home, Jobs, job detail and generic content pages show the same public traffic numbers wherever the shared footer is rendered.
- The visitor endpoint now supports a read-only GET for aggregate totals; POST remains the only path that increments visits/page views.
- Compact number formatting moved to one shared helper instead of living inside the footer.
- Public navigation links moved to one shared source used by the default SiteNav, PublicSiteNav and Jobs page; mobile dock navigation remains deliberately separate because it has a different approved information architecture.
- Generic content pages now compose the existing shared PageHero, WorkspaceShell and SurfaceCard primitives rather than maintaining a parallel hero/card shell.
- Homepage live opportunity counters remain in their approved #1b2a3f navy band. Footer traffic remains compact and separate.
- Shared semantic tokens now include warm public hero surfaces/borders, on-dark text and focus color. Public home/jobs/job-detail/alerts/navigation components use shared design tokens instead of repeating Daraja brand hex values.
- Email scraper templates remain self-contained intentionally because CSS custom properties are not reliable across email clients.
- No job ingestion, Apply routing, authentication, permissions, schema, payment, scraper or candidate-data behavior is changed by this cleanup batch.


## Current batch: Tanzania-first Smart CV Builder foundation

- Candidate career workspace now includes a protected Smart CV Builder at `/account/career/cv`.
- CVs are first-class private records owned by the signed-in candidate. The additive `CandidateCv` model supports Master and Tailored versions, General and Tanzania Public Service modes, target role/job context, language, structured CV content, theme settings and a stored ATS-readiness score.
- The builder starts from candidate-approved Daraja profile facts and never requires a public CV URL or document upload.
- Users can create multiple versions, duplicate a Master CV for a specific vacancy, edit structured sections, reorder sections and export through an A4 print-to-PDF view.
- Public job detail pages now offer `Tailor CV for this job`, passing the Daraja vacancy into the builder so the readiness engine can compare supported CV language against the selected job.
- The first smart layer is deterministic and provider-free: completeness checks, Tanzania public-service requirements, experience/bullet quality checks, role-relevant keyword coverage and supported keyword-gap suggestions. It does not claim or calculate a guaranteed interview/shortlist probability.
- Tanzania Public Service mode adds postal-address and three-referee readiness checks in line with common PSRS application requirements. General mode stays lean for private-sector, NGO and bank applications.
- Design freedom is separated from CV facts: users can choose template treatment, unrestricted six-digit hex accent color, ATS-safe font, density, header alignment, heading style and section order. The preview/export remains semantic text-first single-column HTML without skill bars, canvases or text embedded in graphics.
- CV versions are included in Daraja account-data export and explicitly erased with candidate account deletion.
- Candidate document upload remains independently scanner-gated and is not enabled by the CV Builder.
- No paid AI/provider dependency is introduced in this batch. Future AI wording assistance remains subject to D-007/D-015 review-and-approve rules and must never invent candidate facts.


### Smart CV Design Studio expansion

- The CV Builder now uses a combinatorial ATS-safe design engine instead of relying on a small fixed-template catalogue.
- Candidates can generate a fresh design without changing any CV facts. The generator adapts its design pool for Tanzania Public Service, finance/banking, technology, NGO/health/social-sector and general private-sector contexts.
- Design controls now combine base personality, unrestricted six-digit hex accent colour, ATS-safe font, density, header alignment, header treatment, section-heading treatment, bullet style, contact separator, name scale, page margin and section order. These combinations create effectively unlimited presentation variants while preserving one semantic single-column document structure.
- Added Verdana and Tahoma to the existing ATS-safe font choices.
- Custom colours remain unrestricted, but the preview derives a separate readable text accent when a chosen colour is too light, so design freedom cannot make the name or headings illegible.
- The preview remains HTML text with semantic headings/lists; no canvas, skill bars, text-in-image or multi-column parsing risks were introduced.
- The product now explicitly encourages candidates to reach 90+ ATS readiness while keeping job-match scoring separate. Both remain quality/relevance indicators, not promises of shortlisting or interview.


## Minimal candidate account hub

- Added protected `/account` as the candidate account home, using the previously supplied job-board profile references as layout inspiration while keeping Daraja's shared typography, colors and spacing.
- The account hub intentionally avoids the large PageHero/dashboard-card pattern. It uses one compact identity header, a real profile-completion status, and a single list of account actions.
- Account actions point only to working Daraja features: Personal information, Smart CV Builder, Career workspace, Job alerts, Notifications, Privacy & data and Sign out.
- CV count and alert status are shown only when backed by current account data; no placeholder metrics or fake activity are displayed.
- The mobile header user icon now opens `/account`; the mobile More sheet also exposes My account. Existing account subpages include Account as their first shared tab.
