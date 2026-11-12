# AzamPay production integration — engineering contract

**Status:** Design / merchant onboarding pending. **No live checkout enabled.**
**Merchant legal entity:** MAZIKU HOLDINGS LIMITED
**Product/site:** Daraja / Ajira (`daraja.co.tz`, `ajira.daraja.co.tz`)
**Owner:** Workstream E (Payments and billing)
**Tracking:** #225
**Date:** 2026-11-10 (current state updated 2026-11-12)

## Current state — 12 November 2026 (read this first)

- **Provider contract:** answered from AzamPay's official Tanzania docs; see `docs/AZAMPAY-PROVIDER-CONTRACT-QUESTIONS.md`. No collection-status API is documented; the RSA-signed callback is AzamPay's confirmation.
- **Settlement rule (D-037):** a callback bound to our saved checkout `transactionId`, with matching amount and a valid AzamPay signature, marks the booking `PAID` for admin fulfilment. Verified failure or a definitive checkout refusal closes that attempt as `FAILED` so the employer can retry. Ambiguous outcomes stay `UNKNOWN`.
- **Code aligned with the docs:** binding is checked before any key request; the key is cached per process and re-fetched once only after a bad signature; `X-API-Key` (optional) goes to the checkout host only; the token is obtained before the one-shot checkout claim; undocumented token `expire` formats get a short local lifetime instead of blocking checkout.
- **Still required before real money:** one real sandbox payment on an approved, isolated test deployment to observe `transactionId` = `externalreference`, token `expire`, phone format and callback retries; employer pay screen and admin bookings view; KYC through an AzamPay-confirmed channel; production keys and callback URL from AzamPay; separate owner approval. Production stays OFF.

## Current workflow and non-negotiable invariants

The existing `app/advertise/page.js` sells a Featured Job promotion at the server-configured `promo.price`, comprising one WhatsApp Channel post and placement as Featured on Ajira for `promo.days`. Employers currently submit vacancy details via WhatsApp/contact, Daraja verifies and approves their vacancy, employers pay by Lipa Namba/payment instructions, and an admin sets `featuredUntil` **after confirmed payment**.

**Preserve this order**: vacancy verified -> payment requested -> provider-verified settlement -> human-controlled publication/featured activation. Do **not** charge candidates to browse/apply; do not charge employers for unreviewed/unapproved vacancies; do not automatically publish on callback. Preserve the manual booking and Lipa Namba payment flow as a fallback until gated live launch.

`prisma/schema.prisma` contains a legacy `Payment.amount Float` table and `PayStatus` PENDING/SUCCESS/FAILED. Do not extend its floating-point design for new gateway transactions. `lib/account-data-export.js` and `lib/account-deletion.js` handle legacy payments: new data needs privacy and deletion/export review before deployment.

## Proposed canonical flow

1. Only an authenticated, authorized owner of an **approved promotion booking** can initiate checkout. Existing booking path is WhatsApp/contact, not an authenticated order; an approval-linked order/booking owner must be designed and tested before enabling public checkout. No free-floating amount/price from browser.
2. Server snapshots `promo.price` (positive, safe whole TZS) and `promo.days`, merchant legal entity and approved order ID. Create an immutable price snapshot and unique order ID; idempotency key scoped to booking/attempt.
3. Provider adapter requests hosted or tokenized collection in **TZS**, using current officially documented API. Server-only secrets, allowlisted provider hosts, bounded timeouts and safe errors. Never store card details, PINs or customer payment secrets.
4. Persist a pending attempt before external request; record returned provider reference and state without logging sensitive payloads. Explicit unknown/pending state for network timeouts; never assume failure is safe to retry as a new order.
5. Callbacks are untrusted until verified using the exact current official AzamPay authentication/signature specification **and/or authoritative transaction status query**. Compare merchant account, amount, currency, order ID and provider reference. Record immutable provider event ID or stable deduplication hash. Atomic idempotent transition prevents double activation. Redirects/browser client reports are never proof of payment.
6. Provider-confirmed success marks the approved promotion as **paid/ready for admin fulfilment**. Admin remains responsible for the WhatsApp post and `featuredUntil`. Failed, declined, pending, cancelled, reversed and refunded states remain auditable; reconciliation resolves late callbacks.
7. Return an order status view and safe receipt reference; keep customer email/phone private, use `Cache-Control: no-store`, server authorization checks and request throttling. Do not expose provider credentials or PII in logs, analytics or HTML.

## Recommended incremental data model (migration requires separate review)

Do **not** change production schema before a fresh Neon restore point and approved migration plan. New, independent `PromotionBooking` and `PaymentAttempt` records should have at least:

- `PromotionBooking`: unique ID; employer/booking owner or verified contact linkage; associated verified job (nullable until review); service code `FEATURED_JOB`; snapshot TZS amount as **integer** (TZS whole units if provider uses major units, with explicit conversion contract); package duration; review status; payment status; timestamps; fulfilment evidence; unique idempotency reference.
- `PaymentAttempt`: unique internal ref; booking ID; provider `AZAMPAY`; provider transaction ID (uniqueness where supplied); TZS amount (integer); currency; sandbox/live environment; state including unknown/pending/confirmed/failed/refunded; webhook dedupe; safe JSON metadata allowlist; timestamps.
- `PaymentEvent` or durable verified event record: attempt ID; provider event ID/deduplication key unique; verification outcome; state transition; received/processed times.
- Ownership, account-data export/deletion, audit and retention rules updated atomically with new models. Do not overwrite payment evidence on deletion; de-identify where policy requires.

Schema names are **proposals** to reconcile with the application's canonical admin/employer ownership flow. Do not create a duplicate job or billing model.

## Configuration and deployment gates

- Provider adapter must default disabled: `AZAMPAY_ENABLED=false` and environment explicit `sandbox` / `production`. Production enablement requires a deliberate separate owner action.
- Secrets supplied via the production host's protected environment management, not source, docs, PRs, browser or chat.
- No additional Node worker, scheduled process or crontab overwrite on shared cPanel. Any reconciliation can use existing verified scheduling infrastructure only after separate capacity review.
- Use GitHub source branch, review, tests, production build and canonical manual deployment procedure in `ops/cpanel/README-auto-deploy.md`, with rollback plan.
- Do not replace merchant/bank account ownership or settlement account without explicit owner confirmation.
- For live smoke test, obtain explicit approval for amount, account and recipient; never use real customer data as test fixtures.

## Provider information outstanding

Official commercial pages confirm REST API, sandbox, hosted checkout and webhook notifications:
- https://azampay.com/developers
- https://azampay.com/products/checkout
- https://azampay.com/products/payment-gateway
- https://azampay.com/pricing

**Before implementing request payloads, obtain official current developer API specification and sandbox credentials.** Confirm: authentication/token flow; base URLs; hosted checkout/collection API; currency and amount units; exact callback signature or alternative authoritative status verification; webhook retry/order guarantees; refunds; settlement account; reconciliation API; supported production payment methods; per-transaction fees plus VAT; production KYB approval and authorized account association with MAZIKU HOLDINGS LIMITED. Do not infer callback security from unofficial tutorials.

## Validation checklist

- Approved vs rejected vacancy: only approved can pay; no candidate charging.
- Ownership: cross-employer checkout, status and callback tampering rejected.
- Money: zero/negative/overflow/float currency mismatch rejected; amount snapshot preserved despite later admin price change.
- Initiation: retries/timeouts do not create duplicate orders or transactions.
- Provider: missing token, rate limit, malicious redirect, unexpected host, 4xx/5xx and timeout safe.
- Callback: forged/unsigned, valid duplicate, out-of-order and repeated success, unknown order/provider, wrong amount/currency/merchant, replay and reversal safe.
- Reconciliation: callback delayed or lost; query provider and resolve pending states without double fulfilment.
- Privacy: redacted logs/analytics, customer payment data private; export and account-erasure policies tested.
- Operations: audit trail, admin manual review, refund handling, feature flag off disables initiation but leaves verification/reconciliation functional for outstanding payments.
- Tests, lint, production build, Prisma validation, reviewed additive migration and rollback/restore evidence required before enablement.

## Progress / blockers

- **Done:** reviewed `app/advertise/page.js`, `lib/features.js`, current Prisma payment schema and project policies; produced this production integration contract; original manual payment flow unchanged.
- **Not done:** API adapter, schema, payment UI, tests, sandbox transactions, merchant approval, live credentials, live deployment.
- **Blocked:** authorized merchant/API documentation and credentials plus approved order-owner lifecycle; production schema/release approval.

Do not mark the integration shipped until the verification and release gates are complete.

## Verified API-flow evidence (2026-11-10)

The **official** https://developerdocs.azampay.co.tz/azampay-api-flow page says AzamPay APIs use a two-step process: (1) obtain an access token using application authentication credentials; (2) consume the actual API. The rendered page contains a general flow diagram but not a complete machine-readable request/response, payment callback or settlement contract.

**Integration consequence:** implement token acquisition/cache/expiry securely on the server and send authenticated requests only after credentials have been provisioned; exact header names and signature rules require the official endpoint reference and live sandbox confirmation. Never expose the token to the browser or reuse tokens between sandbox and production.

Third-party, **non-authoritative** SDK docs show a Tanzania MNO checkout (customer phone, TZS amount, provider, unique external ID) and a partner-hosted checkout endpoint. They also show callback payload variations. These are research leads, **not approved production schemas**. In particular, do not infer that a successful initiation response or a raw webhook status means collected money; do not accept unsigned callbacks because a community example does.

**Documentation follow-up:** obtain the AzamPay official auth endpoint schema, payment initiation endpoint schema, hosted-checkout URL contract, server verification/public-key or authoritative collection status endpoint, callback subscription/verification details, and sandbox examples from the AzamPay team. Confirm each before wiring actual money handling.

## Concrete server-side authentication prototype (2026-11-10)

The branch now includes `lib/payments/azampay-api-client.mjs`: a **disabled-by-default** credential client using the separate documented-by-community sandbox and live hostnames. The official AzamPay flow confirms the two-stage token process, but not the precise HTTP request and expiry contract. The prototype currently assumes `POST /AppRegistration/GenerateToken`, `{appName, clientId, clientSecret}`, and a response of `{success: true, data: {accessToken, expire}}` as shown by **third-party implementations**. AzamPay must validate these details before sandbox onboarding and any production activation. See additional community references: https://github.com/Rodgence/Azampay-PHP-integration and https://pub.dev/documentation/azampay/latest/ . The SDK examples are not authoritative.

The module contains **no caller-facing checkout method, payment status lookup, merchant registration or callback handler**, and cannot mark an order paid. It can make gated low-level authenticated requests when properly configured, but all tests use mock responses only. A 200 checkout response would still only mean API acceptance, not settlement.

**Evidence:** 21/21 isolated mock unit tests passed on the connected cPanel host (outside the live app, with no production DB or environment changes). **Not evidence of:** successful AzamPay sandbox authentication, successful payment, callback authenticity, persistence, full lint/build or production readiness.

**Next approved development unit:** design the reviewed additive promotion booking and payment attempt migration with user/booking ownership, account export/erasure, optimistic or transactional status updates and a provider-event ledger. No schema should be applied without a Neon restore point and migration review. Real callback parsing remains blocked on official signed-callback / authoritative query documentation.

## Draft additive ledger committed (2026-11-10; no database changes applied)

The feature branch now includes the proposed `PromotionBooking`, `PaymentAttempt` and `PaymentEvent` Prisma models, plus SQL migration `20261110143000_azampay_promotion_payment_ledger`. This migration is **not applied** to Neon or production and must be separately reviewed before release. Existing `Payment.amount Float` is unchanged. New amounts use integer TZS, with SQL positivity/currency/environment checks; reference and event keys are unique. PaymentEvent records require a trusted provider-verification implementation before they can be written to indicate settlement.

`lib/account-data-export.js` includes account-owned bookings and sanitized attempts; `lib/account-deletion.js` de-identifies owner and approver IDs while retaining minimal financial evidence. These updates must be included in any future migration deployment as one controlled release.

Evidence from the isolated connected-host working directory: 25 targeted mock/static tests passed, JavaScript syntax checks passed, and the Prisma schema validated. **Not tested:** migration execution on a database, replay/transactional update service, end-to-end sandbox collection, live authorization or complete production build.

Production sequence remains: authoritative AzamPay contract and merchant credentials -> complete owner-authorized booking/order workflow -> signed webhook or authoritative transaction verification -> atomic persisted status transitions and reconciliation -> test on isolated sandbox database -> review migration with fresh restore point -> explicit owner-authorized release. Payment service stays disabled throughout development.

## Callback authenticity hardening (10 Nov 2026)

Added `lib/payments/provider-signature.mjs`, a fail-closed RSA-SHA256 verification primitive. It requires a canonical message, base64 signature and trusted PEM public key; missing/invalid signatures and tampered messages return false. It **does not** infer callback field order, construct messages from arbitrary JSON, download or trust a public key dynamically, create a webhook route, or mark transactions paid. The official AzamPay callback signing/canonicalisation contract and key-rotation rules are still required before integration. An unofficial SDK suggests RSA signatures for callbacks but its allowance of unsigned callbacks is **not accepted** in Daraja.

**Tests:** 39/39 isolated mock/static tests passed, including signature forgery, status/reference tampering and wrong key. This validates local primitives only, not AzamPay-signed webhooks or settlement.

**Disposable PostgreSQL test blocker:** connected shared cPanel host and current isolated workspace have no local `postgres`, `initdb`, `pg_ctl`, `psql`, Docker or Podman binary. Do not use existing production Neon as a substitute. A separate, explicitly identified disposable PostgreSQL database is needed for applying the draft migration, realistic transactions, concurrent request collision tests and rollback verification. Do not create billable Neon branches or change production DB without approval.

**Authoritative verification limitation:** Tanzania transaction-status examples in external SDK documentation describe disbursement status, not necessarily mobile-money collections. Do not use disbursement status as proof of collection. Obtain the actual collection lookup/reconciliation API and signed callback contract from AzamPay before allowing `SUCCESS` transitions.

## Draft sandbox checkout and callback endpoints — 11 November 2026

Two sandbox-only Node.js routes are now present in **draft PR #226** (still unmerged): `POST /api/payments/azampay/sandbox/checkout` and `POST /api/payments/azampay/callback`. They **cannot operate by default**; in addition to the base sandbox flag they require two independently configured switches `AZAMPAY_SANDBOX_ROUTES_ENABLED=true` and `AZAMPAY_SANDBOX_DEPLOYMENT_APPROVED=true`. Setting flags requires a separately approved test deployment; flags are not themselves proof of authorization. Neither sandbox route can be used in `AZAMPAY_MODE=production`.

The checkout route requires an authenticated verified employer and same-origin, rate-limited JSON request, loads the booking and amount from the database, and claims the attempt exactly once via compare-and-set. It sends only the validated amount, provider, phone and internal reference to the pinned AzamPay sandbox checkout URL, stores the returned authenticated `transactionId` and returns **PENDING, not PAID**. Any ambiguous response or timeout locks the record `UNKNOWN` rather than sending another prompt. The registered browser callback path is not live until an explicitly approved deployment of the feature branch.

The callback route accepts a bounded JSON body (16 KB) without logging raw callback contents. It fetches the key from pinned sandbox origin, validates RSA-SHA256 over the reported canonical callback fields, requires signed `externalreference` to equal the authenticated checkout `transactionId` already saved on the attempt, and compares callback amount to the stored snapshot. Matching signed successes use the existing serializable ledger writer; failures become event records requiring reconciliation. No automatic job featuring or WhatsApp publishing. Missing checkout receipts yield a retryable response to avoid losing callbacks received before their initiation receipt is committed.

**Important remaining checks:** although the hand-off describes the intended AzamPay contract, the exact production/sandbox transaction ID mapping, token expiry format, accepted phone formatting, public-key response/rotation behavior, provider callback retry semantics and merchant account lifecycle have **not been observed through a genuine sandbox transaction**. The callback parser and status writer must be reviewed against redacted actual sandbox evidence before activating either route. No customer prompts or actual provider calls have been performed. Do not claim this is live or production-ready.
