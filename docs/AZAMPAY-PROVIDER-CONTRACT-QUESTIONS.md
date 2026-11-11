# AzamPay Tanzania MNO collections — provider contract questions (11 Nov 2026)

**Status: UNSENT.** This is a minimal, sanitized support request to the official AzamPay developer support channel. No credentials, account numbers, live customer data or raw callbacks may be included.

## Proposed message

**Subject:** Daraja Ajira sandbox — confirm MNO collections status verification and callback contract

Hello AzamPay Developer Support,

We are integrating your **Tanzania sandbox MNO checkout** for our Daraja Ajira website, under merchant **MAZIKU HOLDINGS LIMITED**. Before initiating our first sandbox transaction, please confirm:

1. Does the Tanzania sandbox provide an **authoritative server-to-server status lookup for an incoming MNO collection** initiated via `POST /azampay/mno/checkout`? Please provide the exact endpoint, authentication method, request/response example, allowed statuses and which reference identifier to query. We understand the commonly documented `transactionStatus` interface is for **disbursements**, not collections.
2. If no incoming-collection status endpoint exists, what is the approved verification/reconciliation procedure for proving a payment was collected before fulfilling a customer booking? Is a signed callback alone sufficient according to your authoritative merchant contract, and how are disputes/late reversals handled?
3. In the signed callback, does `externalreference` match the authenticated checkout response's `transactionId`, `pgReferenceId` or a different field? Is `utilityref` guaranteed to equal our submitted `externalId`? Please share a **redacted** sandbox response and callback example.
4. Please confirm the **RSA public-key** endpoint and parameters (including whether `?format=Pem` is required), signed canonical field order, key rotation, whether `signature` may be null, and delivery/retry timing for 5xx, timeouts, and a cold-starting callback server.
5. Confirm sandbox authentication token `expire` timestamp format/timezone; valid Tanzanian MSISDN format and accepted provider strings; and whether `X-API-Key` is required for checkout and public-key retrieval.
6. Can a merchant configure a **separate HTTPS sandbox callback URL**, different from its production Ajira domain, through the developer portal? Is any origin allowlist update necessary?

We will use synthetic test records in an isolated database, with sandbox routes disabled until these details are confirmed.

Thank you,
Daraja Ajira integration team

## Evidence and safeguards
- Official portal accessible: https://developers.azampay.co.tz/sandbox/documentation
- Official API schema URL reported in existing integration handoff: https://developerdocs.azampay.co.tz/tanzania/v1/schema.json — could not be fetched through our read-only browser tooling at the time of review. Do **not** infer contents.
- Third-party Dart SDK documents Tanzania `transactionStatus` as a disbursement-status operation, whereas Rwanda has a separately documented collections-status interface. Neither is sufficient proof of a Tanzania collections endpoint.
- Current draft PR #226 accepts signed callback success as **REVIEW ONLY**, leaves booking `APPROVED`, and requires independent reconciliation to mark `PAID`. It does not initiate any payment.
- Never send this inquiry to an unverified KYC site, and never include client secret, portal token, sandbox API key or customer identifiers.

## Provider response checklist
Record the date, official support contact/case number, relevant official docs URL or redacted example, and the exact field mapping. If response cannot be authenticated as originating from AzamPay, keep settlement disabled.
