# Sign in with Apple — Daraja web setup

**Status: implementation prepared, not enabled in production.** The product
owner confirmed that an active Apple Developer Program membership exists.
Membership alone does not confirm that the web Services ID and key have been
configured for this site. Do not enable without live callback tests.

## Existing sign-in methods that must continue working

- LinkedIn OIDC (verified email), Google OAuth, and email/password.
- Existing sessions, employer/admin role routing, suspended accounts, safe
  callback URLs, and candidate profile onboarding must be preserved.
- Apple does **not** automatically link accounts by email. Apple's Hide My Email
  relay addresses must be treated as distinct; do not correlate or silently
  merge accounts across Google/LinkedIn/email based on relay addresses.

## Apple Developer setup (outside GitHub)

1. Verify a primary App ID that has Sign in with Apple enabled.
2. Create/configure an Apple **Services ID** for Daraja web authentication,
   linked to that primary App ID.
3. Register the approved HTTPS website domain and exact return URL. For the
   current Ajira-hosted Daraja web service:
   - Domain: `ajira.daraja.co.tz`
   - Return URL: `https://ajira.daraja.co.tz/api/auth/callback/apple`
   Verify the actual canonical Auth.js host before entering these. If the
   product's public domain changes, review and update these values.
4. Generate a Sign in with Apple private key in the Apple Developer account.
   The Auth.js client secret is an Apple-signed **JWT**, not the raw .p8 key.
   Manage JWT expiry and renewal as an operational responsibility.
5. Set these **server-only** environment settings directly in the hosting
   secret manager, never in chat, GitHub, browser code or logs:
   - `AUTH_APPLE_ID`: Apple Services ID (not iOS bundle ID)
   - `AUTH_APPLE_SECRET`: valid signed Apple client-secret JWT
   - `AUTH_APPLE_ENABLED=true`: **only after final verification**
6. If using Apple's private email relay, register and authenticate Daraja's
   account-email sending domain with Apple for relay delivery (SPF/DKIM).
   Check actual confirmation, account recovery and job-alert delivery.

## Security design

- The Apple provider is registered only when the enable flag and both
  credentials exist. Without them, there is no Apple button or Apple OAuth
  configuration.
- `allowDangerousEmailAccountLinking: false`: identical Apple/Google/password
  email strings do **not** grant account takeover. Existing users must use
  their established sign-in method until an explicit identity-verified
  linking flow is designed.
- Apple returns a cross-site OAuth `form_post`. The sole exception to
  Daraja's origin filter is the exact configured
  `/api/auth/callback/apple` path with form content type and an acceptable
  Apple origin. Auth.js still validates OAuth state and identity claims.
  All other writes retain the regular origin/rate protections.
- Never turn on the provider merely because the button renders successfully.

## Prepared environment files and offline check

- `config/apple-auth.env.example` documents the server-only variable names
  with the Apple feature disabled by default. It contains no credentials.
- `npm run auth:apple:check` runs `scripts/check-apple-auth-config.cjs`.
  Disabled is an expected safe state. If enabled, the command checks presence,
  HTTPS origin, Apple JWT header/claims and expiry, without logging token or
  private key material. **It cannot verify JWT signatures or Apple Developer
  configuration.** A successful format check never authorizes activation.
- `test/apple-auth-config.test.js` covers disabled, invalid, expiring and
  structurally valid configurations. The positive test uses an intentionally
  fake signing value and does not exercise live Apple authentication.
- Provider setup and secret injection are deferred to an authorized owner of
  the Apple Developer account and the host's protected environment interface.

## Release verification checklist

- Existing password, LinkedIn and Google logins still work.
- A new Apple ID can register through the configured HTTPS callback and
  reach candidate profile onboarding.
- A returning Apple ID signs into the same existing Daraja account.
- Apple Hide My Email creates a separate safe identity; relay email delivery
  works when the user consents.
- A matching email address from another provider is **not** automatically
  merged with an existing Daraja account.
- Expired/replayed/mismatched OAuth state, absent/invalid client secrets,
  suspended accounts, wrong callback domains and missing Apple credentials
  fail safely.
- Signed-in employer/admin role permissions and candidate privacy remain
  unchanged. Test mobile Safari and desktop browsers.
- Verify Apple's full flow with staging credentials/domain where possible
  before the owner authorizes any production provider-setting change.

Owner-facing status should remain nontechnical. See AGENTS.md.
