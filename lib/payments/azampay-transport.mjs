/**
 * Reusable server-only HTTP transport. No AzamPay payment endpoints are guessed
 * here: the verified API contract must supply exact URLs and token acquisition.
 *
 * Transport does not assert that an HTTP success means funds are collected.
 * Never expose this module's token or response payloads to a browser.
 */

const MAX_RESPONSE_BYTES = 256 * 1024;
const DEFAULT_TIMEOUT_MS = 10000;

function providerUrl(value) {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash ||
      url.pathname !== "/" || !url.hostname || !url.port && url.hostname === "localhost") {
    throw new TypeError("Provider origin must be an HTTPS origin");
  }
  return url.origin;
}

function validatePath(path) {
  if (typeof path !== "string" || !path.startsWith("/") || path.startsWith("//") ||
      path.includes("\\") || /[?#]/.test(path) || /%(?:2f|5c)/i.test(path)) {
    throw new TypeError("Request path must be a relative API path");
  }
  return path;
}

export class AzamPayTransportError extends Error {
  constructor(code, { httpStatus } = {}) {
    super(code);
    this.name = "AzamPayTransportError";
    this.code = code;
    // Status code only; provider response bodies are never attached.
    if (Number.isInteger(httpStatus)) this.httpStatus = httpStatus;
  }
}

/**
 * The tokenSupplier is a trusted server-only adapter implemented against the
 * official authentication endpoint. Its result is { token, expiresAtMs }.
 * The caller also supplies the pinned origin sourced from trusted server config.
 * An optional apiKey is sent as `X-API-Key`, as in AzamPay's official
 * checkout code sample, on every request to the pinned (checkout) origin.
 */
export function createAzamPayTransport({
  origin, tokenSupplier, fetchImpl = globalThis.fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS, now = () => Date.now(), apiKey,
}) {
  const pinnedOrigin = providerUrl(origin);
  if (typeof tokenSupplier !== "function" || typeof fetchImpl !== "function" ||
      !Number.isSafeInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 30000 ||
      (apiKey !== undefined && (typeof apiKey !== "string" || apiKey.trim().length < 3 ||
        apiKey.length > 2048 || /[\r\n]/.test(apiKey)))) {
    throw new TypeError("Invalid AzamPay transport configuration");
  }
  let current = null;
  let pending = null;

  async function token() {
    if (current && current.expiresAtMs > now() + 30000) return current.token;
    if (!pending) {
      pending = Promise.resolve().then(() => tokenSupplier()).then((value) => {
        if (!value || typeof value.token !== "string" || value.token.length < 12 ||
            !Number.isFinite(value.expiresAtMs) || value.expiresAtMs <= now() + 30000) {
          throw new AzamPayTransportError("INVALID_PROVIDER_TOKEN");
        }
        current = { token: value.token, expiresAtMs: value.expiresAtMs };
        return current.token;
      }).finally(() => { pending = null; });
    }
    return pending;
  }

  async function request({ path, method = "GET", body, signal } = {}) {
    const safePath = validatePath(path);
    if (!["GET", "POST"].includes(method) || (method === "GET" && body !== undefined)) {
      throw new TypeError("Unsupported payment API operation");
    }
    const target = new URL(safePath, pinnedOrigin);
    if (target.origin !== pinnedOrigin) throw new TypeError("Cross-origin request blocked");
    const accessToken = await token();

    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
    const abortCaller = () => controller.abort();
    if (signal?.aborted) controller.abort();
    signal?.addEventListener?.("abort", abortCaller, { once: true });

    try {
      const response = await fetchImpl(target.href, {
        method, redirect: "error", cache: "no-store", signal: controller.signal,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
          ...(apiKey ? { "X-API-Key": apiKey } : {}),
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      if (!response || typeof response.status !== "number") {
        throw new AzamPayTransportError("INVALID_PROVIDER_RESPONSE");
      }
      if (response.status === 401) current = null;
      if (response.status < 200 || response.status >= 300) {
        throw new AzamPayTransportError("PROVIDER_HTTP_ERROR", { httpStatus: response.status });
      }
      const text = await response.text();
      if (text.length > MAX_RESPONSE_BYTES) {
        throw new AzamPayTransportError("PROVIDER_RESPONSE_TOO_LARGE");
      }
      try {
        return JSON.parse(text);
      } catch {
        throw new AzamPayTransportError("INVALID_PROVIDER_JSON");
      }
    } catch (error) {
      if (error instanceof AzamPayTransportError) throw error;
      throw new AzamPayTransportError(timedOut ? "PROVIDER_TIMEOUT" : "PROVIDER_NETWORK_ERROR");
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener?.("abort", abortCaller);
    }
  }

  /**
   * Obtain (or reuse) the access token without calling the provider API.
   * Callers that must not repeat an operation (one-shot checkout) prepare
   * first, so a token/configuration failure happens before their claim.
   */
  async function prepare() {
    await token();
  }

  return Object.freeze({ request, prepare });
}
