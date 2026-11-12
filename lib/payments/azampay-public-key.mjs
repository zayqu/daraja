import { createPublicKey } from "node:crypto";
import { AzamPayTransportError } from "./azampay-transport.mjs";

// Official docs: GET /azampay/v1/public-key, same authentication as the
// checkout APIs; `format` defaults to Pem, response {success, format,
// publicKey}. Cache locally (~24 h) and re-fetch once if verification fails.
const KEY_PATH = "/azampay/v1/public-key";
const KEY_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Fetch AzamPay's public key using a pinned-origin authenticated API client.
 * Must only be used with the *sandbox* client until the merchant's production
 * host and key distribution have been independently confirmed.
 * Keys remain in process memory and are never fetched from callback-provided URLs.
 *
 * Since a dynamically fetched key authenticates its origin but not a merchant,
 * callers MUST additionally bind the signed externalreference to the provider
 * transaction ID persisted from an authenticated checkout response.
 */
export function createAzamPayPublicKeyProvider({
  apiClient, now = () => Date.now(), ttlMs = KEY_TTL_MS,
} = {}) {
  if (apiClient?.mode !== "sandbox" || typeof apiClient.request !== "function" ||
      typeof now !== "function" || !Number.isSafeInteger(ttlMs) ||
      ttlMs <= 0 || ttlMs > KEY_TTL_MS) {
    throw new AzamPayTransportError("PUBLIC_KEY_PROVIDER_NOT_CONFIGURED");
  }

  let cached = null;
  let fetching = null;
  let generation = 0;

  async function load() {
    const result = await apiClient.request({ path: KEY_PATH, method: "GET" });
    if (result?.success !== true || typeof result.publicKey !== "string" ||
        result.publicKey.length > 16384 ||
        !result.publicKey.includes("-----BEGIN PUBLIC KEY-----")) {
      throw new AzamPayTransportError("PUBLIC_KEY_RESPONSE_INVALID");
    }
    let key;
    try {
      key = createPublicKey(result.publicKey);
    } catch {
      throw new AzamPayTransportError("PUBLIC_KEY_RESPONSE_INVALID");
    }
    if (key.asymmetricKeyType !== "rsa" ||
        (key.asymmetricKeyDetails?.modulusLength || 0) < 2048) {
      throw new AzamPayTransportError("PUBLIC_KEY_RESPONSE_INVALID");
    }
    const current = Object.freeze({
      pem: key.export({ format: "pem", type: "spki" }),
      expiresAt: now() + ttlMs,
      generation: ++generation,
    });
    cached = current;
    return current.pem;
  }

  async function getPublicKey({ forceRefresh = false } = {}) {
    if (!forceRefresh && cached && cached.expiresAt > now()) return cached.pem;
    if (!fetching) {
      fetching = Promise.resolve().then(load).finally(() => { fetching = null; });
    }
    return fetching;
  }

  async function verifyWithRefresh(verifier) {
    if (typeof verifier !== "function") {
      throw new AzamPayTransportError("INVALID_CALLBACK_VERIFIER");
    }
    const first = await getPublicKey();
    if (await verifier(first) === true) return true;
    // Refresh exactly once after signature validation fails; do not
    // silently fall back to unsigned responses or accept a failed refresh.
    const next = await getPublicKey({ forceRefresh: true });
    return (await verifier(next)) === true;
  }

  return Object.freeze({ getPublicKey, verifyWithRefresh });
}
