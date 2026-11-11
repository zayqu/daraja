# AzamPay staging preparation — owner-approved, NOT deployed
**Status:** preparation approval granted 11 November 2026. No application, database, DNS, callback or payment deployment approved yet.

## Scope of this approval
Assess the existing cPanel host and prepare an *isolated* zero-USD staging runtime plan. **Do not** change `master`, merge PR #226 or #227, run `prisma migrate deploy` against Neon, provision a paid service, upload merchant secrets, change AzamPay's registered callback URL, configure a public staging endpoint or initiate a transaction without separate explicit authorization.

## Current assessment
- The existing connected cPanel device `c8.my-control-panel.com` is **offline** (remote connector reported last seen approximately 2 hours before this run).
- Historical process usage reached 71–72 of 100 slots during previous periods, with multiple Node workers. **Historic usage is not a current measurement.**
- Capacity therefore **NOT VERIFIED**. The default action is to stop; do not assume room for another resident Node worker.
- Daraja's existing `ops/cpanel/deploy.sh` defaults to `/home/darajaco/repositories/daraja`, `https://ajira.daraja.co.tz`, the live `cpanel-production` release and live worker health checks. Never use this deploy script unchanged for staging.
- Real Prisma/temporary PostgreSQL GitHub tests passed previously. A GitHub Actions database service is ephemeral and **cannot receive external AzamPay callbacks** after the job ends; it is not a public staging host.

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
