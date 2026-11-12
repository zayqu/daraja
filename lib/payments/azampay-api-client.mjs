import { azamPayAvailability } from "./azampay-core.mjs";
import { AzamPayTransportError, createAzamPayTransport } from "./azampay-transport.mjs";

/**
 * Server-only, intentionally gated AzamPay API client.
 *
 * Sandbox origins, the token request ({appName, clientId, clientSecret}) and
 * the {success, data: {accessToken, expire}} response follow AzamPay's
 * official Tanzania API reference (reviewed 12 Nov 2026). Production origins
 * are still community-reported: AzamPay supplies production details after
 * KYC, and production stays separately gated (AZAMPAY_PRODUCTION_APPROVED).
 * There is no production/customer checkout API exposed by this module.
 */
const AUTH_PATH = "/AppRegistration/GenerateToken";
const DEFAULT_TIMEOUT_MS = 10000;
// AzamPay does not document the `expire` format or timezone.
const FALLBACK_TOKEN_TTL_MS = 5 * 60 * 1000;
const MAX_TOKEN_TTL_MS = 60 * 60 * 1000;
const ISO_WITH_ZONE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/;

const ALLOWED_ORIGINS = Object.freeze({
  sandbox: Object.freeze({
    auth: "https://authenticator-sandbox.azampay.co.tz",
    checkout: "https://sandbox.azampay.co.tz",
  }),
  production: Object.freeze({
    auth: "https://authenticator.azampay.co.tz",
    checkout: "https://checkout.azampay.co.tz",
  }),
});

function requireText(value, label) {
  if (typeof value !== "string" || value.trim().length < 3 || value.length > 2048) {
    throw new TypeError(`Missing or invalid ${label}`);
  }
  return value;
}

function tokenLifetime(value, now) {
  // Never guess a timezone. An explicit ISO 8601 offset/Z expiry is used
  // (capped at one hour); a missing, zone-less or unreadable `expire` gets a
  // short local lifetime instead of blocking checkout. A 401 always clears
  // the cached token.
  if (typeof value === "string" && ISO_WITH_ZONE.test(value)) {
    const timestamp = Date.parse(value);
    if (Number.isFinite(timestamp)) {
      if (timestamp <= now + 30000) throw new AzamPayTransportError("INVALID_TOKEN_EXPIRY");
      return Math.min(timestamp, now + MAX_TOKEN_TTL_MS);
    }
  }
  return now + FALLBACK_TOKEN_TTL_MS;
}

export function createAzamPayApiClient({
  env = process.env,
  fetchImpl = globalThis.fetch,
  now = () => Date.now(),
  timeoutMs = DEFAULT_TIMEOUT_MS,
} = {}) {
  const availability = azamPayAvailability(env);
  if (!availability.enabled) {
    throw new AzamPayTransportError("AZAMPAY_DISABLED");
  }
  const { mode } = availability;
  const origins = ALLOWED_ORIGINS[mode];
  if (!origins || typeof fetchImpl !== "function" ||
      !Number.isSafeInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 30000) {
    throw new TypeError("Invalid AzamPay API configuration");
  }
  const appName = requireText(env.AZAMPAY_APP_NAME, "application name");
  const clientId = requireText(env.AZAMPAY_CLIENT_ID, "client ID");
  const clientSecret = requireText(env.AZAMPAY_CLIENT_SECRET, "client secret");
  // Optional: AzamPay's official checkout sample sends `X-API-Key` with the
  // Bearer token. It goes only to the checkout origin, never to the token call.
  const apiKey = env.AZAMPAY_API_KEY || undefined;
  if (apiKey !== undefined) requireText(apiKey, "API key");

  async function tokenSupplier() {
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), timeoutMs);
    try {
      const response = await fetchImpl(origins.auth + AUTH_PATH, {
        method: "POST",
        redirect: "error",
        cache: "no-store",
        signal: abort.signal,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ appName, clientId, clientSecret }),
      });
      if (!response || response.status < 200 || response.status >= 300) {
        throw new AzamPayTransportError("TOKEN_HTTP_ERROR");
      }
      const raw = await response.text();
      if (raw.length > 16384) throw new AzamPayTransportError("TOKEN_RESPONSE_TOO_LARGE");
      let parsed;
      try { parsed = JSON.parse(raw); }
      catch { throw new AzamPayTransportError("INVALID_TOKEN_RESPONSE"); }
      if (parsed?.success !== true || typeof parsed.data?.accessToken !== "string") {
        throw new AzamPayTransportError("TOKEN_REJECTED");
      }
      return {
        token: parsed.data.accessToken,
        expiresAtMs: tokenLifetime(parsed.data.expire, now()),
      };
    } catch (error) {
      if (error instanceof AzamPayTransportError) throw error;
      throw new AzamPayTransportError("TOKEN_NETWORK_ERROR");
    } finally {
      clearTimeout(timer);
    }
  }

  const transport = createAzamPayTransport({
    origin: origins.checkout, tokenSupplier, fetchImpl, timeoutMs, now, apiKey,
  });

  // Only a lower-level authenticated request is available, not a payment
  // initiation or webhook route. Caller must not equate HTTP 200 with payment.
  return Object.freeze({ mode, request: transport.request, prepare: transport.prepare });
}
