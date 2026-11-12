# AzamPay staging preparation — owner-approved, NOT deployed

## Chosen test site — 12 November 2026 (owner decision; read this first)

**Decision:** run the one sandbox test payment on a **separate free test site**, never the live site: the PR #226 Vercel preview at `https://daraja-git-feature-azampay-production-readiness-zayqus-projects.vercel.app` with its own new free Neon database named `daraja_sandbox`. Nothing touches `ajira.daraja.co.tz` or the production database.

**Facts checked 12 Nov 2026:**
- The AzamPay portal's Register App page failed for most of 12 Nov (`Network error`, `Messages.FailedToGenerateClientSecret`); AzamPay was emailed about it at 13:47 EAT (to `info@azampay.co.tz`, CC `compliance@azampay.com` and `product@azampay.com`; +255 746 000 000 is not on WhatsApp). It worked again that afternoon, and the sandbox callback now points at the test site (steps 5 and 6 below are done). The KYC-link question is still unanswered.
- **Risk to know:** all six Vercel variables, including `DATABASE_URL`, are scoped "Production and Preview", so every Vercel preview uses the live database. The test branch must get its own branch-scoped `DATABASE_URL` before any payment switch is turned on for it.
- Vercel previews sit behind Vercel Authentication. "Protection Bypass for Automation" (available on Hobby) accepts `x-vercel-protection-bypass` as a header or query parameter, so AzamPay's callback URL can carry it.
- Sign-in works on a preview host: the session cookie set by password sign-in is host-only. Set `AUTH_URL` to the preview URL, or same-origin checks refuse the sign-in. Google sign-in does not work on previews; use the seeded password accounts.
- Rehearsed locally with the built app on a throwaway `daraja_sandbox`: seeded accounts sign in, request → approve → pay box works, the employer cannot approve, unsigned callbacks get 401, and no AzamPay call is made before the pay step.

**Setup (owner does every step that involves a secret):**
1. Neon: new free project, database name `daraja_sandbox`; copy its connection string.
2. GitHub → Settings → Secrets → Actions: `SANDBOX_DATABASE_URL` (that string) and `SANDBOX_TEST_PASSWORD` (8+ characters, letters and a number). Optional variable `SANDBOX_ADMIN_EMAIL` (default `admin@daraja.co.tz`).
3. Add the label `azampay-sandbox-setup` to PR #226. `.github/workflows/azampay-sandbox-setup.yml` refuses any database not named `daraja_sandbox` or already holding data, then runs `prisma migrate deploy` and `scripts/azampay-sandbox-setup.mjs seed`. That seeds the test admin, the verified test employer `sandbox-employer@example.com`, one test vacancy, and switches the employer portal on in that database only. It never receives the production `DATABASE_URL`.
4. Vercel → Environment Variables → Preview, branch `feature/azampay-production-readiness` only: `DATABASE_URL` (the test string, first), `AUTH_URL` (the preview URL), `AZAMPAY_ENABLED=true`, `AZAMPAY_MODE=sandbox`, `AZAMPAY_SANDBOX_ROUTES_ENABLED=true`, `AZAMPAY_SANDBOX_DEPLOYMENT_APPROVED=true`, `AZAMPAY_APP_NAME`, `AZAMPAY_CLIENT_ID`, `AZAMPAY_CLIENT_SECRET`, and optionally `AZAMPAY_API_KEY` (the portal Token).
5. Vercel → Deployment Protection → Protection Bypass for Automation → Add Secret (leave the value blank so Vercel generates it). **Done 12 Nov 2026** (note "AzamPay sandbox callback").
6. **Done 12 Nov 2026, about 17:55 EAT:** the sandbox callback for the app "Daraja Ajira" is `https://daraja-git-feature-azampay-production-readiness-zayqus-projects.vercel.app/api/payments/azampay/callback?x-vercel-protection-bypass=<that secret>`; a fresh page load confirmed the address and that its code matches the Vercel secret (checked without displaying it). The portal will not save while the Allowed URLs box is empty, so the test-site origin was entered there; after a reload the box shows empty again. It appears to serve the hosted checkout's `requestOrigin`, which Daraja does not use. The live domain is no longer the registered sandbox callback. Update the Vercel keys if AzamPay issues new ones; do not press "Generate New Key" unless the Client Secret is lost.
7. Redeploy the preview. Then: employer requests → admin approves → employer pays with the sandbox number → expect `PAID`. A 401 on the callback in Vercel's request logs means `transactionId` ≠ `externalreference`; a refused checkout shows "AzamPay did not start this payment" (try adding `AZAMPAY_API_KEY` or check the number format).

**Afterwards:** delete the bypass secret (it opens every preview of this project, and previews use the live database), remove the branch-scoped AzamPay keys, and record redacted evidence in `PROGRESS.md`.

## Cloudflare Workers compatibility decision — 11 November 2026

**Verdict: NO-GO for a direct lift-and-shift of the existing AzamPay checkout/callback routes to Cloudflare Workers Free.** A deliberately separate small callback receiver is possible in principle, but **not yet proven to complete the authenticated checkout workflow**. Do not create Cloudflare resources or alter the merchant callback.

Verified source-code dependencies:
- `app/api/payments/azampay/sandbox/checkout/route.js` is a **Next.js route** with `getActor()`, `readProtectedJson()`, verification of real employer/booking/job and a Prisma transaction. A standalone callback Worker cannot replace it.
- `lib/prisma.js` uses `PrismaPg` with a normal TCP PostgreSQL connection. Workers needs an edge-compatible connection path, such as `@prisma/adapter-neon` with the Neon serverless driver, or Cloudflare Hyperdrive / nodejs_compat with a suitably tested driver.
- Callback verification uses `node:crypto` RSA, public-key operations and hash generation; test the exact `nodejs_compat` runtime and bundle, not merely assume compatibility.
- Gateway transport uses Node primitives, AbortController and token auth; compatible behavior and expiry formats still need real sandbox checks.
- Workers Free restrictions: 100,000 requests/day, 10 ms CPU/request, 128 MB memory, 50 external subrequests/request and 64 MiB Worker-size limit, as published 29 Oct 2026. A signed callback with key parsing, JWT auth and Prisma calls must be load-tested for CPU and startup.
- Cloudflare Workers supports Neon connections (official Cloudflare documentation), so the DB network path is viable, but **not an authorization to connect to production Neon**.
- Free Workers do not keep a sleeping origin application alive, but callback delivery/retry contract is still unverified and a separate authenticated checkout/UI route remains necessary.

**Superseded 12 Nov 2026 by D-037:** AzamPay's official docs document no collection-status API and make the signed callback the confirmation, so a fully bound, signed success now marks the booking `PAID` (admin fulfilment unchanged). The paragraph below is kept as history.

**Payment-integrity correction on draft PR:** Previously the callback processor constructed an `authoritative:true` verifier result from the signed notification alone and immediately marked bookings `PAID`. This contradicted `collection-settlement.mjs`'s requirement for an independent authoritative server-to-server collection-status check. It is now changed to store deduplicated `SIGNED_SUCCESS_REVIEW` (or `VERIFIED_FAILURE_REVIEW`) events and set the payment attempt to `UNKNOWN` for manual/independent reconciliation; the booking remains `APPROVED`, with no auto-publishing or second checkout. Until the authentic provider collection-status interface is established, a sandbox callback alone must not settle funds.

**Decision:** keep existing full Next.js route on a separately isolated test runtime when one becomes available, or scope a **new callback-only Worker experiment** only after a specific approval for additional adaptation work. Cloudflare has no direct evidence of being a faster end-to-end path than Render; do not extend scope without an authenticated checkout plan.

References: https://developers.cloudflare.com/workers/platform/limits/ ; https://developers.cloudflare.com/workers/databases/third-party-integrations/neon/ ; https://www.prisma.io/docs/orm/v7/prisma-client/deployment/edge/deploy-to-cloudflare .

## Evaluated zero-dollar alternative — 11 November 2026

PROPOSED ONLY, NOT PROVISIONED: create a NEW independent Neon Free PostgreSQL project in the existing Daraja organization, plus a NEW isolated Render Free HTTPS web service for the feature branch with automatic deployment disabled. Neither may share production Daraja credentials, existing application/database roots, cookies, or real customer records.

Connected-account findings: the Daraja Neon organization uses the Free plan and has several existing projects. Published Neon Free plan (November 2026) offers 100 projects, 1 GB per project and 100 CU-hours/project/month; exact quota availability and no billing upgrade must be checked before creation. Render has existing free web services in the same workspace. Its Free instances have 512 MB RAM; the workspace shares 750 free instance-hours/month, plus bandwidth/build allowances. Current usage was not verified. A new service could exhaust shared allowances, disrupt existing free services, or incur excess bandwidth charges, so **free does not automatically meet the user's strict zero-USD/no-disruption requirement**. The application is Next.js standalone and may not fit a 512 MB instance. Render Free Postgres expires after 30 days, so prefer a fresh Neon Free project rather than its database. Vercel Hobby restricts business/commercial use.

DECISION GATE: previous authorization covered staging PREPARATION, not creation of third-party resources, live URL changes, gateway credentials, or a real transaction. Obtain explicit approval before any new Neon project/Render service. First demonstrate no-spend quota availability, verify no impact on existing free Render services, create only an isolated empty database with synthetic fixtures and separate private secrets, keep all payment feature flags OFF until test approval. Stop if limits, hosting eligibility, or cost cannot be verified.

**Status:** preparation approval granted 11 November 2026. No application, database, DNS, callback or payment deployment approved yet.

## Scope of this approval
Assess the existing cPanel host and prepare an *isolated* zero-USD staging runtime plan. **Do not** change `master`, merge PR #226 or #227, run `prisma migrate deploy` against Neon, provision a paid service, upload merchant secrets, change AzamPay's registered callback URL, configure a public staging endpoint or initiate a transaction without separate explicit authorization.

## Current assessment
- The cPanel device was offline during initial preparation; it reconnected later on 11 November and live read-only measurements are recorded below.
- Historical process usage reached 71–72 of 100 slots during previous periods, with multiple Node workers. **Historic usage is not a current measurement.**
- Host-wide basic capacity measured below; per-account LVE and DB isolation **remain NOT VERIFIED**. The default action is to stop; do not assume room for another resident Node worker.
- Daraja's existing `ops/cpanel/deploy.sh` defaults to `/home/darajaco/repositories/daraja`, `https://ajira.daraja.co.tz`, the live `cpanel-production` release and live worker health checks. Never use this deploy script unchanged for staging.
- Real Prisma/temporary PostgreSQL GitHub tests passed previously. A GitHub Actions database service is ephemeral and **cannot receive external AzamPay callbacks** after the job ends; it is not a public staging host.

## Verified live host preflight — 11 November 2026, 14:23 EAT

Authorized remote cPanel agent came back **online**. Read-only checks ran on account `darajaco`:

| Check | Observed result |
|---|---|
| Process slots | **55/100** threads (the conservative allowed baseline is **at the ceiling**) |
| Registered Node apps | 4: Daraja, Smart Motorz, THA production, THA staging v2 |
| THA workers | Two `lsnode` processes for THA production, **9 threads each**; do not alter without separate production review |
| Node | v22.22.2 |
| Host memory | ~59,487,272 KiB `MemAvailable`; host-wide, **not** cPanel LVE allotment |
| Filesystem | 87% utilized on `/home/darajaco` filesystem; `df` is filesystem-wide, **not** the account disk quota |
| PostgreSQL | `psql`, `initdb`, `postgres`, `pg_isready` not on account PATH; no running `postgres` process visible; expected PG Unix socket absent; **separate PostgreSQL availability not established** |
| MySQL | Socket visible, but **not** a substitute for the application Prisma/PostgreSQL schema |
| Quota / LVE | `quota` and `lveinfo` unavailable to account; cPanel per-account resource headroom **not verified** |

**Additional decisive finding:** read-only cPanel UAPI `Postgresql list_databases` returned `status: 0` with error **"This server does not support this functionality."** The shared cPanel account cannot presently provision PostgreSQL through this interface. Do not attempt an unsupported workaround by writing to MySQL or installing a database daemon into the account.

**Operational decision: HOLD / NO-GO for staging installation at this time.** Meeting the 55/100 historical ceiling is insufficient: no demonstrated spare CloudLinux limit and no verified isolated PostgreSQL DB/user. No staging app/DB/DNS/callback change was made. Do not kill the THA workers or commandeer THA staging to create headroom.

**To unblock without extra cost:** obtain cPanel provider confirmation of available account-level Node process/LVE headroom and a separate PostgreSQL database/user under the current plan, OR propose a completely separate zero-dollar staging topology with evidence of no new charges and no production data/Neon access. A future staging deployment still requires explicit approval; this approval covered preparation and capacity checking only.

## Step 1 — read-only capacity preflight
Reconnect the authorized Desktop Commander agent. As the cPanel account (not root), execute from a **clean checkout of the feature branch**:

```bash
bash -n ops/azampay/staging-preflight.sh
bash ops/azampay/staging-preflight.sh
```

It reports account threads, minimum disk/host memory, and prints isolation checks without reading secrets or writing anything. Its threshold is deliberately conservative: **at most 55 account threads** out of 100 before staging installation. Even a passing result is **not enough**: check the CloudLinux LVE limits, cPanel concurrent Node process entitlement, and whether new workers would cause THA/Ajira/MZH instability. Stop if headroom cannot be demonstrated.

## Step 2 — choose only a truly isolated staging topology
Minimum requirements:
- Separate domain or subdomain with valid HTTPS, a dedicated Node app root and port, separate runtime/build artifact and deployment state dir, and no existing-production restart trigger
- Separate staging PostgreSQL database AND user (not `secrets.DATABASE_URL`, not a Neon production branch with real data), with no production tables and a dedicated restricted credential
- Dedicated staging app secrets, session cookie domain and authentication origin; no production cookies or shared administrator sessions
- Stub/disable job scraping, crons, newsletters, real notifications, public indexing, advertising and production analytics; use one synthetic verified employer, approved featured booking and synthetic vacancy fixture
- DNS and callback URL under owner control, **AzamPay sandbox portal callback registration updated only after separate approval**
- Private rotated Client Secret stored exclusively in the sandbox host's secure environment; never GitHub, shell history, terminal output, chat or docs
- Staging must not publish vacancies, activate live featured listings or deliver WhatsApp promotional posts

If hosting has no safe spare worker or no isolated PostgreSQL option within **0 USD**, mark staging as **blocked**; do not substitute the live Neon database. A free hosting trial or temporary service that may incur charges is not approved.

## Step 3 — deploy requires separate owner authorization
When all requirements are evidenced, propose a staging-only plan naming **exact app root, target hostname, database engine, isolation mechanism, TLS, available process slots, and rollback**. Do not run deployment until explicit approval. Use a separate staging runner/build artifact; never reuse the production auto-deploy runner.

An initial smoke test should confirm both payment routes return 404 with all flags off; after confidential sandbox setup and controlled enablement, verify independent sandbox-only gating, no production secrets, and callback body/headers without exposing sensitive payload.

## Step 4 — final acceptance criteria
1. Observe official sandbox auth token response format/expiry; no secrets saved to logs
2. Confirm MNO phone format, amount/currency, provider response shape and mapping of authenticated checkout transaction ID to the callback's signed `externalreference`; fail closed if mismatch
3. Test valid pending checkout, signed success (booking paid exactly once, **not auto-fulfilled**), signed failure/reconciliation, duplicate callbacks and an ambiguous timeout
4. Reconcile records in the isolated database; manually verify event uniqueness and no second payment prompt
5. Record only redacted evidence and command results; do not present unit tests as live gateway evidence
6. Disable sandbox routes at completion; get separate approval for real payment/merchant KYB and production release

## Explicit stop conditions
- Remote cPanel is offline, capacity/LVE cannot be verified or threads exceed threshold
- No separate PostgreSQL service/user can be created with documented 0-USD cost
- Any command could modify the production Ajira runtime, master workflow, Neon, DNS, cPanel production cron or AzamPay portal callback unexpectedly
- Merchant Client Secret is not rotated from the previously visible one-time portal value, or would need to be pasted into a shared channel
- Callback contract/transaction-ID mapping differs from the draft code

**Operational status as of this preparation:** No staging environment was provisioned. Approval covers preparation and eligibility checks only.
