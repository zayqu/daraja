import { azamPayAvailability } from "./azampay-core.mjs";
import { AzamPayTransportError, createAzamPayTransport } from "./azampay-transport.mjs";

/**
 * Server-only, intentionally gated AzamPay API client.
 *
 * The auth path and response fields are based on third-party SDK examples,
 * NOT independently validated against a merchant-issued API contract.
 * The exact endpoint origins must be explicitly supplied by the owner through
 * private server configuration after AzamPay validates the integration.
 * There is no production/customer checkout API exposed by this module.
 */
const AUTH_PATH = "/AppRegistration/GenerateToken";
const DEFAULT_TIMEOUT_MS = 10000;

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

function parseExpiration(value, now) {
  // The provider's expiry timezone remains unverified. Reject ambiguous
  // timestamps rather than silently interpreting them as server-local time.
  // Accept only an explicit ISO 8601 UTC offset or Z suffix.
  if (typeof value !== "string" ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) {
    throw new AzamPayTransportError("INVALID_TOKEN_EXPIRY");
  }
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp) || timestamp <= now + 30000) {
    throw new AzamPayTransportError("INVALID_TOKEN_EXPIRY");
  }
  return timestamp;
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
  // An API key may be required by merchant sandbox configuration; it is not
  // assumed to be required in every environment.
  const apiKey = env.AZAMPAY_API_KEY;
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
          ...(apiKey ? { "X-API-Key": apiKey } : {}),
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
        expiresAtMs: parseExpiration(parsed.data.expire, now()),
      };
    } catch (error) {
      if (error instanceof AzamPayTransportError) throw error;
      throw new AzamPayTransportError("TOKEN_NETWORK_ERROR");
    } finally {
      clearTimeout(timer);
    }
  }

  const transport = createAzamPayTransport({
    origin: origins.checkout, tokenSupplier, fetchImpl, timeoutMs, now,
  });

  // Only a lower-level authenticated request is available, not a payment
  // initiation or webhook route. Caller must not equate HTTP 200 with payment.
  return Object.freeze({ mode, request: transport.request });
}
