# AzamPay sandbox hand-off — 10 November 2026

**Target:** `zayqu/daraja` · draft PR #226 · `feature/azampay-production-readiness`
**Merchant:** MAZIKU HOLDINGS LIMITED · Brand/product: Daraja Ajira
**Purpose:** engineering hand-off based on owner-provided sandbox investigation. This document does **not** assert that Daraja independently reproduced the external database experiments or verified AzamPay's complete merchant API contract.

## Sandbox app registration (reported by owner)
- App name: `Daraja Ajira`.
- Registered callback: `https://ajira.daraja.co.tz/api/payments/azampay/callback` (**not implemented yet**).
- Allowed origin: `https://ajira.daraja.co.tz`; “allow all URLs” disabled.
- Registration expiry: 10 November 2027.
- The owner retains Client ID, Client Secret and a portal Token in a password manager. **Never paste keys in chat, docs, tickets or GitHub.**
- Merchant KYB and production keys are **not** confirmed. The portal’s reported external `replit.app` KYC link is **unverified**; do not enter corporate documents there without written confirmation from AzamPay through an official contact channel.

## AzamPay API details reported from official Tanzania v1 schema
Source for revalidation: https://developerdocs.azampay.co.tz/tanzania/v1/schema.json (reported snapshot 10 Nov 2026). Review the canonical schema and test against actual sandbox responses before accepting money.

| Operation | Reported interface |
|---|---|
| Sandbox auth | `https://authenticator-sandbox.azampay.co.tz`, `POST /AppRegistration/GenerateToken` with `appName, clientId, clientSecret` |
| Sandbox MNO collections | `https://sandbox.azampay.co.tz`, `POST /azampay/mno/checkout` with `accountNumber, amount, currency: TZS, externalId, provider`. Providers reported: Airtel, Tigo, Halopesa, Azampesa, Mpesa. |
| Public verification key | `GET /azampay/v1/public-key` with Bearer token, response includes `publicKey`. Trust origin, pin/rotate keys and validate response. |
| Callback signature | RSA-SHA256 PKCS#1 v1.5 over UTF-8 concatenation `utilityref + externalreference + transactionstatus + operator` (no delimiters); Base64 `signature`. |
| Collection status | An authoritative *collection* status endpoint is **not confirmed**. A disbursement status endpoint must not substitute. |

Callback fields reported: `utilityref`, `externalreference`, `transactionstatus`, `operator`, `signature`, `amount`, `reference`, `transid`, `clientId`, `msisdn`, and other fields including **password**. Do not log/store raw callbacks. `amount` and `clientId` are **not signed**, therefore matching `externalreference` to an authenticated checkout response is mandatory before changing booking state. Reject callbacks missing `signature`; never accept a browser redirect or mere HTTP 200 as proof of payment. Confirm in sandbox which returned transaction identifier corresponds to signed `externalreference`.

Production origins and auth expiry format are not confirmed. `X-API-Key` requirement and portal Token purpose need sandbox confirmation.

## Critical CI deployment risk
`.github/workflows/cpanel-staging-build.yml` used `github.event_name != 'pull_request'` to guard `prisma migrate deploy` and cPanel release publication. That included manual `workflow_dispatch` on any branch and could use production `secrets.DATABASE_URL`. **Separate fix PR #227** changes those steps to `github.event_name == 'push' && github.ref == 'refs/heads/master'`. Review/merge PR #227 first with normal authorization. PR #226 remains draft, unmerged and undeployed.

## External database test report supplied with hand-off (not independently reproduced here)
- Throwaway PostgreSQL 16.15, all 17 migrations reportedly executed as raw SQL.
- 12/12 schema constraints passed; 12/12 payment scenarios reportedly passed across three runs via a `pg`-based Prisma-compatible stand-in.
- 40 simultaneous checkout attempts reportedly produced one payment attempt; 40 success confirmations reportedly produced one event, with conflicts retried.
- Cross-owner access, unapproved booking, wrong amount, provider reference collision, environment mismatch, partial-write rollback reportedly rejected/rolled back.
- 48 previous mocked tests passed at report creation. Real `prisma migrate deploy`, real Prisma client, Next.js build and real AzamPay gateway requests **not covered** by that report.
- Use new isolated CI job to independently establish actual Prisma behavior.

## Required sequence before external sandbox testing
1. Validate CI guard PR #227 independently. Never manually run the old release workflow on the feature branch.
2. Run `npm ci`, `prisma generate`, `prisma migrate deploy` and real Prisma-backed concurrency/payment tests against an **ephemeral GitHub Actions PostgreSQL service**, with literal throwaway `DATABASE_URL` and no repository secrets.
3. Verify application-level ownership and approved booking route, store checkout `transactionId` before callback acceptance, enforce exact signed reference binding. Never emit a public sandbox checkout until callback verification works.
4. Test key retrieval and signature verification against authentic sandbox callbacks and record exact observed callback field mapping, auth expiry timezone, phone formatting, supported methods, retry semantics and X-API-Key requirement. Redact private values.
5. Choose a separate test deployment with isolated database where possible. An admin-only sandbox checkout on the live domain **still writes to live Neon** and needs separate restore-point, data handling and deployment approval.
6. Only then assess production merchant KYB, fees/VAT, settlement account, refund/reversal policy and explicitly approved deployment/controlled live transaction.

## Current engineering gates
- Production: OFF. No checkout UI, no callback route, no accepted transactions.
- PR #226: draft. New payment schema/migration **must not be applied to production Neon yet**.
- Do not assume 48 local mocked unit tests or external raw-SQL test report prove real Prisma concurrency behavior.
- Keep zero-USD infrastructure constraint. GitHub Actions ephemeral PostgreSQL is the preferred no-extra-hosting path.

## Questions for AzamPay
- Official KYB upload channel for MAZIKU HOLDINGS LIMITED; do they control the third-party KYC host?
- Production API base origins, app/merchant activation and settlement account.
- Authoritative MNO **collection** status lookup, callback retries, receipt ID mapping and key rotation.
- Whether Checkout requires `X-API-Key`, portal Token meaning and token `expire` format/timezone.
- Actual sandbox phone format, provider availability, fees inclusive of VAT, settlements, reversals and refunds.
