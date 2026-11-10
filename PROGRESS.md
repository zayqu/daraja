# Daraja Jobs production-readiness progress

## AzamPay sandbox key and checkout validation (2026-11-10; isolated only)

- Added `lib/payments/azampay-public-key.mjs`: sandbox-only, authenticated API public-key retrieval from `/azampay/v1/public-key`, RSA key validation (minimum 2048 bits), in-memory 24-hour cache, parallel request coalescing, and a single forced refresh on failed signature verification. **Only accepts an explicitly provided trusted sandbox API client**; there is no public HTTP route or live callback wiring. Trust of the exact key delivery and rotation semantics must be confirmed against the actual sandbox.
- Added `lib/payments/azampay-sandbox-checkout.mjs`: pure MNO checkout request validation and authenticated initiation response parser. Supported reported sandbox provider names Airtel/Tigo/Halopesa/Azampesa/Mpesa, TZS whole shillings in range 1–5,000,000, explicit phone assumption `255[67]XXXXXXXX` (needs confirmation), and preexisting server-controlled internal reference. A successful HTTP response is **not proof of funds collected**. No checkout network call or customer payment initiated by these helpers.
- Targeted local tests `test/azampay-public-key.test.mjs` and `test/azampay-sandbox-checkout.test.mjs` ran in isolated cPanel testing directory: **12/12 passed**, all with mocks, no AzamPay credentials or network requests.
- **Critical next task before a checkout route:** persist a database-backed checkout claim/lease and transaction ID compare-and-set to prevent concurrent requests sending multiple provider prompts, and avoid any automatic new checkout after ambiguous timeout. Confirm callback-signed `externalreference` exactly matches the authenticated checkout response `transactionId` in actual sandbox. Until then no public checkout UI or callback activation.
- PR #226 remains draft/unmerged; previous full app CI build green; production untouched. Secrets visible in portal must be rotated by owner before real testing.


## CI build repair verified (2026-11-10; sandbox checkout not activated)

- The earlier full build failed in Next.js 16.4.1 `next/font/google` while parsing a remote Nunito font response (`Cannot read properties of null (reading '1')`). Fixed on the draft feature branch by loading the same Nunito weights through the browser stylesheet with a system-font fallback instead of requiring a Google Fonts response at CI build time. The font remains Nunito where clients can reach the font service; loading now occurs at runtime and external font requests/privacy/offline behavior should be reviewed before production release. Updated typography assertions for the new setup without introducing a competing app font.
- **GitHub Actions run #42836369725 succeeded:** tests, lint, Prisma validation, Next.js Webpack production build, standalone cPanel runtime smoke/package checks. No release was published or deployed by this PR run.
- **GitHub Actions run #42836369910 succeeded:** real Prisma migration and transaction suite against ephemeral PostgreSQL, not production Neon.
- Production remains OFF, PR #226 draft/unmerged. The next milestone is an approved isolated sandbox host + database with privately rotated AzamPay credentials, registered callback set to that host, a confirmed provider transaction ID mapping, and a real sandbox checkout/callback. Do not enable live payment UI, deploy or alter production Neon without separate owner approval.


## Payment development checkpoint — closed for now (2026-11-10)

**Decision:** retain draft PR #226 for future sandbox activation; do not merge, close the PR, run customer checkout, apply the production migration or deploy. This completes the *currently authorized code preparation*, not the AzamPay merchant integration.

**Verified:** isolated GitHub Actions PostgreSQL + real Prisma migration/concurrency test succeeded at run #42832401910. Callback/reference-binding and signature tests passed locally (12/12). Standalone safety PR #227 remains draft and unmerged.

**Unresolved:** latest main application CI run #42832401908 failed at `next build --webpack` with `next/font`: `TypeError: Cannot read properties of null (reading '1')`. Other tests and Prisma validation passed; build failure not diagnosed or fixed. This **blocks release**, regardless of whether the issue is payment-related. The registered sandbox callback route is not live; there is still no real checkout transaction or confirmed callback ID mapping.

**Required restart gates:** owner rotates one-time visible sandbox Client Secret and manages all app secrets privately; confirm AzamPay's actual callback ID mapping and public-key lifecycle using sanctioned sandbox testing; resolve full Next.js CI build failure; confirm restore-point and deploy plan before any Neon migration; explicit separate approval before merging PRs or production deployment. Do not submit KYB to unverified external hosts.


## Sandbox callback binding preflight (2026-11-10; no live calls)

- Inspected registered **Daraja Ajira** sandbox app in a connected portal tab and verified intended callback path. Sensitive credential values shown by the portal were **not copied into code, GitHub, logs, or configuration and were not used**. Owner should rotate the one-time visible Client Secret after saving securely in a password manager. Sandbox merchant keys must be provisioned privately in a controlled test host.
- Added `lib/payments/azampay-callback-verify.mjs`, which checks reported AzamPay callback canonical RSA-SHA256 signature and (critically) binds the *signed* `externalreference` to the stored checkout `providerTransactionId`, and compares unsigned `amount` to the stored TZS amount. Does not accept missing checkout provider ID, incorrect environment or altered status. Signed failures remain failures. Does not expose an HTTP callback route, save records or initiate payments; actual callback/provider ID mapping still needs sandbox verification.
- Restricted low-level callback signature key type to RSA (not RSA-PSS), as expected for PKCS#1 v1.5 in the owner-provided hand-off. Added `test/azampay-callback-verify.test.mjs`.
- Executed targeted tests on isolated server directory: **12/12 pass** for new callback and existing signature tests. Other previous mock/Prisma CI evidence remains separate. No AzamPay network request, live payment, database mutation or production deployment.
- This is a **nonproduction, local verifier only**. The next real-world test requires verified server key retrieval, checkout transaction ID persistence, a protected callback route and an approved test deployment/database, plus an actual sandbox transaction. Do not merge PR #226 as production-ready.


## AzamPay sandbox registration and real Prisma CI (2026-11-10)

- Owner-provided sandbox hand-off added to `docs/AZAMPAY-SANDBOX-HANDOFF.md`. Reported app name `Daraja Ajira`; credentials remain in the owner's password manager, never GitHub. Unverified third-party KYC URL explicitly flagged for official confirmation.
- Added `.github/workflows/payments-db-tests.yml`, using a disposable PostgreSQL 16 service and literal database test credentials without Neon secrets; `test/payments.db.test.mjs` uses the **actual Prisma client** and PrismaPg adapter for 10 concurrent booking attempts and 10 concurrent settlement results, ownership, amount mismatch, and rollback. Test refuses any database URL other than the literal ephemeral CI URL and is skipped in normal `npm test`.
- **Verified first GitHub Actions success:** isolated Postgres job #42830162060 ran real `prisma generate`, `prisma migrate deploy` against container PostgreSQL and the Prisma integration test; job conclusion `success`, 1 database-backed test suite passed, 0 failed. Follow-up isolated CI job #42830965621 also succeeded. This verifies those 10-way cases with actual Prisma, **not** 40-way concurrency or real AzamPay provider responses. The external raw-SQL/stand-in report separately claims 40-way testing, not independently reproduced here.
- Separate draft security PR #227 guards production migrations/release publication so only a `push` to `refs/heads/master` may trigger them and prevents pull-request/manual jobs from receiving `secrets.DATABASE_URL`. Equivalent guard also added on this feature branch. Updated cPanel deployment test assertions to expect the stronger guard.
- Both PRs remain unmerged; no production schema, data, deployment, credentials or payments touched. Merging **either** branch targeting master would cause the master-push production release pipeline, so require explicit deployment approval and backup verification before any merge. Full build CI outcome is still subject to separate checks.


## AzamPay settlement write-stage draft (NOT deployed)

- 2026-11-10: added `lib/payments/collection-settlement.mjs`. It accepts a **trusted internal server-to-server collection verifier dependency** (currently not implemented), requires authoritative proof matching persisted reference, booking, amount, currency, merchant and environment, checks provider transaction identity and verifies booking is still approved. Under serializable database transaction it records unique event, sets attempt SUCCESS and booking PAID. Duplicate statuses are no-ops, conflicts reject or require review, no automatic vacancy publishing occurs.
- Added `test/collection-settlement.test.mjs`; **48/48** cumulative isolated Node mock/static tests passed on shared cPanel host in `/home/darajaco/azampay-test-isolated`. No database migration was applied and all Prisma transaction behavior was mocked; no actual race/concurrency test on PostgreSQL or AzamPay settlement test occurred.
- Real merchant-specific collection verification, callback canonicalization/key trust, allowed deployment and test DB remain blockers. The verified-status function may be used only once supplied by a trusted, independently reviewed AzamPay adapter; callers must never pass an untrusted webhook or browser success boolean as verification.
- PR #226 remains draft, not merged. Live billing disabled, no production changes.


## AzamPay callback signature primitive (draft, no production activation)

- 2026-11-10: added `lib/payments/provider-signature.mjs` with strict RSA-SHA256 verification against caller-supplied trusted public key and exact canonical message. No signature accepted if missing, invalid or altered. Official callback canonical fields, public key trust and rotation, callback handler, authoritative collection status query and transaction writes are **not implemented**.
- Added `test/provider-signature.test.mjs`: **39/39 targeted isolated mock/static tests passed** (all five AzamPay-related files). No real AzamPay signed callback was used; existing API assumptions remain third-party-derived until AzamPay confirms them.
- Checked connected cPanel host and separate container for ephemeral PostgreSQL tools. `postgres`, `initdb`, `pg_ctl`, `psql`, Docker and Podman are unavailable, so a genuine disposable Postgres migration/concurrency test **was not performed**. Explicitly avoided production Neon and any potentially billable database branch.
- Work remains on draft PR #226. No DB migration, production deployment, real customer payment or live billing API was invoked.


## AzamPay approved-booking payment preparation (draft, not deployed)

- 2026-11-10: added `lib/payments/promotion-attempt.mjs` as the isolated server-side booking-to-attempt transaction owner. It requires authenticated employer/admin context, booking ownership, approved Featured Job booking, eligible published/unexpired vacancy, verified employer and correct vacancy ownership. It creates only PENDING records, reuses outstanding PENDING/UNKNOWN attempts and rejects completed or mismatched attempts. Database transaction requests SERIALIZABLE isolation with bounded serialization-conflict retries. **No AzamPay outbound request, billing endpoint or fulfillment** is implemented.
- Added `test/promotion-attempt.test.mjs`. Re-ran AzamPay unit/static tests in isolated directory on connected server: **34 passed, 0 failed**, all database behavior mocked. No live database transaction/concurrency test or end-to-end API test has been performed; the isolation and retry behavior must be tested against a disposable Postgres database before migration/activation.
- Existing manual WhatsApp and Lipa Namba workflow unchanged. Draft PR #226 not merged; payment activation OFF. Still requires validated provider API and status verification, approved migration, server route authorization and full regression checks.


## AzamPay reviewed payment ledger draft (NOT deployed)

- 2026-11-10: added proposed, separate `PromotionBooking`, `PaymentAttempt`, and `PaymentEvent` Prisma models with enum states, integer TZS amounts, unique references/event keys and reviewed SQL migration `20261110143000_azampay_promotion_payment_ledger`. Legacy `Payment.amount Float` unchanged.
- Updated `lib/account-data-export.js` and `lib/account-deletion.js` to include the new promotion records and de-identify booking/approval ownership after account deletion. The SQL migration is **draft only**; it was not applied to Neon or any server database.
- Added ledger checks and ran all four isolated AzamPay test files: **25 tests passed, 0 failed**, plus `node --check` on privacy code and **`prisma validate` passed** on the isolated schema, on connected cPanel host under `/home/darajaco/azampay-test-isolated`. No customer traffic, no production application edits and no credentials used. SQL execution and full app tests/build/lint remain unverified.
- Still blocked from production: verified checkout/callback contract, real sandbox credentials and auth, transactional persistence workflow, owner-to-booking authorization, webhook signature or authoritative status verification, account/settlement approval, fresh Neon restore point, migration review and explicit production release approval. Draft PR #226 must remain unmerged.


## AzamPay credential client (draft PR #226, not deployed)

- 2026-11-10: added `lib/payments/azampay-api-client.mjs` to connect the existing authenticated transport to separate sandbox/production AzamPay authentication and checkout origins behind the disabled-by-default gate; credentials remain server-only, with token expiry checking, reuse and sanitized errors. The GenerateToken endpoint/response assumptions come from third-party SDK references and are **not official-merchant verified**; there is no production-facing API route or checkout invocation.
- Added `test/azampay-api-client.test.mjs`. Executed all three AzamPay test files using `node --test` in the isolated `/home/darajaco/azampay-test-isolated` directory on the connected cPanel host: **21 tests passed, 0 failed**. All provider HTTP calls are mocks. No real funds, customer numbers, live gateway requests or production files changed.
- **Not completed:** authoritative confirmation of actual auth payload/expiry and checkout endpoints; booking/order ownership and persistence, verified webhooks, reconciliation, checkout UI, end-to-end sandbox, full repository checks, migration approval and deployment. Merchant onboarding remains outstanding.


## AzamPay transport foundation (draft, not deployed)

- 2026-11-10: added `lib/payments/azampay-transport.mjs` with server-side bearer-token transport, concurrent token refresh coalescing, HTTPS origin pinning, no redirects, bounded request timeout, strict method/path validation and sanitized provider error classes. Actual AzamPay token endpoint, payloads, callbacks and remote verification remain intentionally **unimplemented** pending official authenticated API contract.
- Hardened `azampay-core.mjs` to fail closed on unknown `AZAMPAY_MODE` and accept strict UUID-shaped internal references.
- Added `test/azampay-transport.test.mjs`. **15/15 targeted unit tests passed** (core + transport) by running `node --test test/azampay-core.test.mjs test/azampay-transport.test.mjs` from a separate isolated directory on the connected cPanel host. This did **not** execute the live application or use provider credentials. No network payment tests, full-repository tests, lint, build or production deploy have been claimed.
- Current feature branch remains draft PR #226, no change to `/advertise`, billing persistence or payment settings.


## Current branch: AzamPay payment safety foundation (not deployed)

- 2026-11-10, workstream E, draft PR #226: added `lib/payments/azampay-core.mjs` with fail-closed sandbox/production activation guard, integer-safe TZS amount validation, opaque payment references, approved-booking payment intent checks and a pure function that assesses **already independently verified** payment statuses against a server-supplied merchant ID, amount, reference, booking and currency.
- Added `test/azampay-core.test.mjs`: seven local Node test cases passed for gating, amount safety, references, approval, duplicate status, mismatches and reversal review. Unit tests were executed in a standalone matching local working copy; full repository lint, build and CI are **not yet verified**.
- There is **no AzamPay token HTTP client, checkout API route, webhook authentication, booking persistence, migration, production environment change or customer-visible checkout** in this batch. Existing WhatsApp/Lipa Namba flow is untouched.
- Blockers: official endpoint/authentication/callback verification contract, merchant credentials and approval, approved booking ownership model, schema review and sandbox tests. No production release authorized by this branch.


Last updated: 10 November 2026

## Current objective

Build Daraja into a secure Tanzania-first work marketplace through small,
tested vertical releases. The current priority is Phase 0 security and privacy
hardening before expanding candidate CV, employer, freelance, payment or AI
workflows.

## Current batch: admin settings validation per format

- Bug (reported from the live admin, 10 Nov 2026): every text site setting was validated as an email sender, so the new "Bookings WhatsApp number", "M-Pesa Lipa Namba" and "Lipa Namba account name" could not be saved; number settings showed a "follower count" error.
- Each text setting in `lib/features.js` now declares `format` (`email`, `phone`, `digits`, `plain`) and `app/api/admin/settings/route.js` validates by it. Phone numbers accept `+255 ...` and are stored as digits; Lipa Namba is digits only; account name is plain text. Number errors now say "Enter a whole number".
- Tests in `test/featured-promotion.test.js` run the real validator against these inputs; related tests pass 24/24.

## Current batch: cron guard aligned with manual deploys (SERVER_RULES Rule 1)

- Conflict fixed: `SERVER_RULES.md` Rule 1 forbids timed deploy cron jobs, but the October cron guard in `ops/cpanel/deploy.sh` still listed the 5-minute `auto-deploy.sh` line as required and would have re-added it during any manual deploy.
- `required_cron_lines` now enforces only the MZH scheduler and MZH backup lines; a test asserts the guard never mentions `auto-deploy.sh`.
- `AGENTS.md`, `CLAUDE.md` and `ops/cpanel/README-auto-deploy.md` now list two locked MZH lines and state that Ajira deploys are run manually once per release.
- `test/cron-guard.test.js` and `test/cpanel-deploy.test.js` pass 17/17.

## Current batch: paid featured jobs (D-036)

- `/advertise` now sells a paid "Featured job" package (WhatsApp Channel post + Featured on Ajira) instead of the TZS 0 pilot. Price, days, bookings WhatsApp number, Lipa Namba and account name are admin settings under "Paid job promotion"; empty WhatsApp/Lipa values hide those details.
- Admins set "Featured until" on the job edit form after payment; `parseFeaturedUntil` sets `featured` and `featuredUntil` (end of day EAT) and an empty value removes the badge. `expireFeaturedJobs` clears expired placements in each scraper lifecycle run.
- Additive migration `20261110090000_job_featured_until` adds `Job.featuredUntil`.
- Monetag setting help text no longer says to keep it off; the owner switches it on in `/admin/settings`.
- Tests: `test/featured-promotion.test.js` (new) and the advertise-page test in `test/whatsapp-recruitment-pilot.test.js` (updated); related admin/public-job tests pass 26/26 and ESLint is clean. DB-backed suites need a generated Prisma client (CI).

## Current batch: closed-job links and branded 404

- Google Analytics (8 Oct - 4 Nov 2026) showed 45 views of the bare "404: This page could not be found" page. Cause: expired vacancies are archived (`active: false`) and `findPublicJob` only reads active jobs, so job links shared on WhatsApp, search results and bookmarks returned Next.js's default 404 once a job closed.
- `lib/public-job.js` now also owns `findClosedPublicJob` (published, archived jobs, minimal fields, same cache tag). `app/jobs/[id]/page.js` renders `components/ClosedJobNotice.js` for those URLs: job title, employer, closing date and links to current jobs in the same category, all jobs, the sector guide, career guides, WhatsApp and alerts. No application link is shown. Old/legacy ids redirect to the closed job's slug.
- Closed job pages are `noindex, follow` with a "Closed: ..." title, so they do not count as thin indexed content; no JobPosting JSON-LD is emitted for them.
- `app/not-found.js` replaces the framework default 404 with a branded `ContentPage` (noindex) linking to jobs, sectors, career guides and contact.
- `test/closed-job-links.test.js` added; `test/job-detail-ui.test.js` updated for the new not-found branch. Related job tests pass 15/15 and ESLint is clean on changed files. (The sitemap test needs a generated Prisma client and fails only in environments without one.)

## Current batch: dynamic admin (D-035)

- 2026-10-22: admin can add / edit / test / remove job websites, manage categories (add, rename, reorder, hide, delete), edit site settings and review rules, trust verified employers, and bulk-moderate jobs. Settings page `/admin/settings`.
- Mobile clean-up: admin drawer, stacked tables, compact row menus; one-line privacy banner and leaner job details on phones.
- Migration `20261022090000_dynamic_admin_sources_categories_settings` (additive: Category, SiteSetting, ScraperSourceSetting columns, Employer.autoPublish). Take a Neon restore point before merging.
- Tests: 376 pass; lint clean; production build passes.

## Current batch: accounts and admin dashboard

- 2026-10-21 (D-034): new `/auth/signin` and `/auth/signup` (Candidate / Employer tabs), `/auth/check-email`, `/auth/forgot-password`, `/auth/reset-password`; API in `app/api/account/*`. Email-link sign-in removed; existing email-link users set a password via "Forgot password".
- Header shows Sign in / Create account (or My account / Admin panel); mobile "More" sheet too.
- `/admin` rebuilt as a sidebar dashboard: Overview (stats, review queue, activity), Jobs (search/filter/paginate, post, edit, publish, archive, delete), Users (role, suspend, reinstate, delete), Employers (add, edit, verify, reject, suspend), Categories (counts, move jobs), Sources (on/off per scraper).
- Migration `20261021120000_admin_suspension_and_source_settings` (additive): `User.suspendedAt/suspendedReason`, `Job.adminEditedAt`, `ScraperSourceSetting`. Take a Neon restore point before merging; the release workflow applies it.
- Email: `RESEND_API_KEY` plus `ACCOUNT_EMAIL_FROM` (falls back to `JOB_ALERTS_FROM_EMAIL`) must be set in cPanel for sign-up confirmation and password reset; without them sign-up asks people to use Google.
- Tests: `test/password-accounts.test.js`, `test/admin-dashboard.test.js`, updated auth/admin UI tests; 370 pass locally; production build passes.

## Current batch: admin dashboard and roles

- 2026-10-21: owner reported landing on the candidate account; the owner user had the default JOB_SEEKER role and `/admin` was hidden behind `EMPLOYER_PORTAL_ENABLED` (off in production).
- Owner email is now always admin (D-033), granted once and audited in `auth.js`; `lib/platform-roles.js` owns owner emails and role dashboards.
- `/admin` works without the employer portal (employer queue still gated) and gains "Users and roles": search users, change Candidate/Employer/Admin via `app/api/admin/users/[id]` (admin-only, same-origin, rate-limited, audited; no self or owner changes).
- `/account` redirects admins to `/admin` and employers to `/employer` when the portal is on.
- Tests: `test/platform-roles.test.js`; `test/request-security.test.js` covers the new route.

## Current batch: scraper field-label titles (AjiraWeb)

- 2026-10-21: AjiraWeb email-application posts with a "label | value" summary table (Employer / Position / Location / Deadline) were read as a vacancy list, so each label became a job title (live example: "Employer at Tata Africa Holdings Tanzania", description "Posts: Tata Africa Holdings (Tanzania) Ltd"). `extractEmailApplicationJobs` in `scraper/sources/ajiraweb.js` now recognises summary tables and uses them for title, company, location and deadline instead.
- Safety net in `scraper/lib/job-policy.js` (`isFieldLabelTitle`): any source producing a bare field-label title is held as PENDING_REVIEW, never auto-published.
- Tests: new cases in `test/ajiraweb.test.js` (pass) and `test/job-publication-policy.test.js`.
- Remaining: already-published label-titled jobs ("Employer", "Position", "Deadline" …) need hiding/correcting from the admin panel; not yet deployed.

## Current batch: homepage redesign (JobBoard-style layout)

- 2026-10-14: homepage sections restyled after the Colorlib "JobBoard" layout (design only, no template code or images). The existing hero (light canvas, bridge animation, search) is kept unchanged by product-owner decision. New: teal stats band with four big counters; new "Latest jobs" list (6 newest public jobs via `getLatestJobs()` in `lib/home-stats.js`, shared `JobCard`); categories; how-it-works; navy "Looking for a job?" band linking to job alerts.
- Site font switched from Poppins to Nunito (JobBoard's typeface) through the single `next/font` instance in `app/layout.js` and the `--font-daraja` token; D-025 updated.
- Phone navigation unchanged: top bar shows logo, notifications and profile only; the bottom dock is the sole menu.
- Job card titles: max two lines with ellipsis (full title in `title`), phone cards use the h4 step (18px) and the title spans the meta column so long deadlines no longer squeeze it.
- Not yet verified on production; deploy pending.

## Current batch: homepage category section redesign

- 2026-10-14: "Browse by category" cards now show a line icon on a tinted tile per category (`components/CategoryIcon.js`), the live open-job count, and are ordered busiest first ("General" last). Empty categories read "New roles soon".
- `lib/home-stats.js` adds `categoryCounts` (one `groupBy` on the public-job filter, inside the existing 5-minute cache).
- Layout: compact horizontal cards (4 columns desktop, 2 tablet), two-column stacked tiles on phones instead of the horizontal scroller. The unexplained mint "featured" tint was removed.
- Tests: `test/home-categories.test.js` (every category has an icon; counts wired in).

## Current batch: job SEO (Google for Jobs, sitemap, titles)

- 2026-10-12: job pages now emit `JobPosting` JSON-LD (`lib/job-seo.js`) when the vacancy has a full description (250+ characters, not "View the official…"), is not expired and has a posting date. Thin listings get no markup, per Google's job posting guidelines.
- Job page titles are now "Role at Employer – Location | Daraja Jobs" (absolute title, so the template no longer drops the suffix).
- `app/sitemap.js` adds every open published job (up to 5,000), regenerated hourly (`revalidate = 3600`); static entries moved to `staticSitemapEntries()`.
- Tests: `test/job-seo.test.js`; `test/platform-quality.test.js` uses `staticSitemapEntries`.
- Note: the earlier "broken /jobs/page-<hash>" finding was a false alarm (Next.js chunk file paths in page source, not real links).
- Next: thin scraped job descriptions still block markup for many jobs; improving descriptions will unlock Google for Jobs for more vacancies.

## Current batch: Monetag paused for AdSense review

- 2026-10-12: AdSense application returned "Meet AdSense program policies". Monetag In-Page Push and Vignette are paused (D-032 update) so the re-review sees a clean site.
- `app/layout.js` passes Monetag zones only when `NEXT_PUBLIC_MONETAG_ENABLED=true`; privacy wording adjusted; `test/google-services.test.js` checks the opt-in.
- Remaining AdSense blockers to fix before resubmitting: thin scraped job descriptions (many say only "View the official ... vacancy") and links to `/jobs/page-<hash>` and `/career-guides/page-<hash>` that return 404.
- To switch Monetag back on after approval: set `NEXT_PUBLIC_MONETAG_ENABLED=true` in cPanel and rebuild.

## Current batch: employer portal ready to switch on

- Employer vacancy form now asks for a closing date (end of day, Tanzania time) and one application method: email or an https application page. `app/api/employer/jobs/route.js` rejects submissions without them, so employer jobs never reach the site with a broken Apply button. Validation is shared with owner vacancies (`parseApplicationDetails` in `lib/owner-vacancy.js`).
- `/admin` now has three queues: employers waiting for verification (Verify / Reject with reason, using the existing audited route), vacancies waiting for review, and live vacancies (searchable, "Remove from site" with a reason) so wrong scraped records can be taken down without database access.
- Publishing an employer-submitted vacancy is refused until that employer is verified.
- `/employer` lists the signed-in employer's own vacancies with status, closing date and rejection reason.
- Tests: `test/employer-portal-launch.test.js`.
- To go live: set `EMPLOYER_PORTAL_ENABLED=true` in the cPanel Node.js app environment and restart. The owner account must already have the ADMIN role to use `/admin`.

## Current batch: Monetag for every visitor

- Owner decision (D-032 updated): Monetag In-Page Push and Vignette now load for all visitors, not only after "Accept", because ads fund free vacancy posting. Google Analytics and AdSense stay consent-gated.
- Banner and privacy policy wording updated to say Monetag ads show to everyone.
- `test/google-services.test.js` now checks Monetag is not consent-gated while AdSense still is.

## Current batch: owner-posted vacancies

- The live site had no working way to post a job: `/post-job` and `/admin` sit behind `EMPLOYER_PORTAL_ENABLED`, which is off in production.
- New `content/vacancies/*.json` (one file per job) published by `scripts/publish-owner-vacancies.js` through the "Publish owner vacancies" workflow on merge to `master`. Jobs are `source: "daraja"`, `PUBLISHED`, keyed by file name (reruns update, never duplicate), audited as `OWNER_VACANCY_PUBLISHED/UPDATED`.
- First vacancy: Radio Presenter & Content Creator (new radio station, Dar es Salaam), email application, deadline 21 October 2026.
- Validation in `lib/owner-vacancy.js`; tests in `test/owner-vacancy.test.js`.
- Next: an owner-only "Post a vacancy" page so posting does not need GitHub.

## Current batch: cron lock and guard fix

- 2026-10-08: the Ajira deploy and MZH backup cron lines were missing again (deleted after 06:50 UTC on 2026-10-07, while only the MZH scheduler line survived). Both were restored in cPanel; the release with Monetag deployed at 06:25 UTC.
- Root cause of the guard not helping: `ensure_required_cron` read its lines through process substitution (`< <(...)`), which fails in cPanel cron shells ("/dev/fd/62: No such file or directory"), so it never restored anything. It now reads a temporary file; `test/cron-guard.test.js` forbids process substitution in `deploy.sh`.
- `AGENTS.md` now has a locked "Shared cPanel cron jobs" section (also referenced from `CLAUDE.md`, `GEMINI.md` and the auto-deploy README): never replace the whole crontab, keep the three required lines, back up and verify around any change.

## Current batch: Monetag ads (AdSense-safe formats)

- Ajira is verified on Monetag (site 3521615) using `public/sw.js` and the `monetag` meta tag.
- Added In-Page Push (zone 11974650) and Vignette (zone 11974652), loaded by `PrivacyControls` (consent-gated at first; now shown to all visitors, see above). No Onclick/Popunder/MultiTag, per D-032, so AdSense stays compliant.
- CSP allows only the named Monetag domains for scripts, connections and frames.
- `test/google-services.test.js` checks the formats stay consent-gated and that no pop-under tag is added.

## Current batch: production cron guard and watchdog

- Root cause found on 2026-10-07: on 2026-10-04 the cPanel crontab was replaced wholesale, silently removing the Ajira auto-deploy, MZH scheduler and MZH daily backup jobs. Ajira stopped receiving releases and MZH backups stopped.
- `ops/cpanel/deploy.sh` (downloaded fresh from each verified release by the installed runner) now runs `ensure_required_cron` on every 5-minute run: it re-adds any missing required line, leaves all other lines untouched, saves the previous crontab as `crontab.before-guard-<UTC>` and never blocks a deployment. MZH lines are only enforced when MZH is installed; the backup line is `0 0 * * *` (server time), matching the job restored in cPanel on 2026-10-07. `touch /home/darajaco/.daraja-deploy/cron-guard.disabled` pauses the guard deliberately.
- `.github/workflows/production-watchdog.yml` checks every 30 minutes that Ajira runs the latest published release, that both sites respond and that ads.txt and the AdSense meta tag remain; GitHub emails the owner on failure.
- Limitation: if the deploy line itself is removed, the guard cannot run until it is restored; the watchdog reports that case.
- `test/cron-guard.test.js` executes the guard against a fake crontab (empty, partial, idempotent, no-MZH and paused cases) and validates the watchdog.

## Current batch: "Before you apply" guidance on job detail

- Job detail pages now show a Daraja-written "Before you apply" block inside the existing content card: who the role type usually suits, how this vacancy's application route works (Ajira Portal, email or employer page), a deadline reminder, a no-fees warning and links to the relevant career guide and sector page.
- `lib/job-quick-guide.js` derives the block only from structured job fields (source, application URL, type, experience, category, deadline); it never restates or invents vacancy requirements, which remain owned by `lib/job-description.js`.
- Styles live in the existing `job-detail.module.css`; no new route, component tree or data access.
- `test/job-quick-guide.test.js` covers Ajira, email, internship and General routes plus rendering; job-detail and quick-guide tests pass and ESLint is clean on changed files.

## Current batch: original career guides and sector pages (AdSense readiness)

- Added ten original Daraja career guides at `/career-guides` (Ajira Portal applications, CVs, application letters, interviews, job scams, email applications, first jobs, reading adverts, documents/referees, career growth). Each is 350+ words of Daraja-written guidance with a Swahili summary.
- Added `/sectors` with an editorial introduction, applicant tips and related guides for every public job category except General. Category names still come only from `lib/job-categories.js`; `lib/sector-guides.js` adds editorial copy and slugs and links to the existing `/jobs?category=` filter rather than a parallel listing.
- Both sections use the shared `ContentPage` layout, are listed in the sitemap and are linked from the footer.
- Purpose: give Ajira substantial original content beyond aggregated vacancy listings ahead of Google AdSense review.
- `test/career-content.test.js` enforces unique slugs, minimum length, Swahili summaries, full category coverage and valid guide links; the sitemap test was updated. Career-content and platform-quality tests pass 21/21 and ESLint is clean on changed files.

## Current batch: resilient cached job-detail reads

- The job-detail metadata, canonical redirect, page content and public job-detail API now share one short-lived cached public-job read instead of issuing separate Prisma queries for the same vacancy.
- The shared detail read reuses the existing `public-jobs` cache tag and 30-second cache window, so moderation invalidation and public-list caching remain aligned.
- Transient Neon database reachability errors are retried a bounded three times before failing; non-retryable database errors still fail immediately.
- This removes the multiple near-simultaneous database reads that could leave a streamed job page on its loading shell when cPanel temporarily could not reach Neon.
- Focused job-detail and routing-contract tests pass 5/5 and ESLint is clean.

## Current batch: server-rendered job detail reliability

- Public job detail pages now load the published vacancy on the server and seed the interactive client with that data, so the position title, employer, content and Apply action do not depend on a second browser fetch after the page appears.
- The public job API and job page share one `lib/public-job.js` loader for active/published and legacy-slug resolution instead of duplicating the lookup rule.
- Client-side fetching remains only as a compatibility fallback when no server seed is supplied.
- This removes the persistent "Loading position..." failure mode seen in live browser verification and improves first render/indexability without changing application ownership or protected data boundaries.
- Focused job-detail/ingestion tests pass 7/7 and ESLint is clean.

## Current batch: application, typography and mobile navigation consistency

- External application destinations continue to be resolved at ingestion, with the shared resolver now following a bounded chain of up to four application/detail/login hops so Apply reaches the deepest verified working destination instead of stopping at an intermediate description page.
- Email-only vacancies still use the employer's verified `mailto:` application method, but clicking Apply now also reveals a copyable recipient/subject fallback when the browser or computer has no configured email handler.
- The floating mobile dock is now the single primary navigation owner across Daraja mobile routes; the mobile header does not expose a competing hamburger menu.
- Candidate/employer workspace tab navigation is hidden at phone widths so it does not appear as a second mobile menu.
- Poppins remains the single Daraja application UI typeface through `next/font/google` and `--font-daraja`. D-025 and D-027 now explicitly document the non-negotiable typography and one-mobile-navigation rules, and tests enforce both.
- Generated CV document font choices remain intentionally separate from the Daraja application UI font.

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
- Homepage live platform counters no longer render in a separate strip. Live opportunities, represented employers/institutions, verified sources and category count are passed into the shared footer beside the existing privacy-safe visitor insights; that footer insight surface uses Daraja navy `#1b2a3f`.
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


## Current batch: Next.js 16.4.1 critical security patch

- The production dependency gate detected newly reviewed Next.js advisories on 23 October 2026 while Daraja was on Next.js 16.4.0.
- Next.js is patched to 16.4.1, including matching runtime `@next/env` and platform SWC lockfile entries. The existing `sharp >= 0.35.5` override remains in place.
- This responds to GitHub-reviewed advisories `GHSA-2464-fhr4-w9xw`, `GHSA-p3m5-59mp-jv5r` and `GHSA-673q-mjm6-r5xr`, all of which list 16.4.1 as the patched Next.js 16 release.
- The focused PR changes no schema, production data, provider configuration, DNS, payment behavior or feature flag.
- Validation on PR #203: production dependency audit, full tests, ESLint, Prisma validation, production build, self-contained cPanel runtime smoke and packaging passed before the final documentation commit; the final head is revalidated before merge.
