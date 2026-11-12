import test from "node:test";
import assert from "node:assert/strict";
import { createAzamPayTransport, AzamPayTransportError } from "../lib/payments/azampay-transport.mjs";

const goodToken = () => ({ token: "a-very-long-test-token", expiresAtMs: Date.now() + 120000 });
const ok = (value = { ok: true }) => ({
  status: 200, text: async () => JSON.stringify(value),
});
const transport = (overrides = {}) => createAzamPayTransport({
  origin: "https://api.sandbox.example.test",
  tokenSupplier: goodToken, fetchImpl: async () => ok(), ...overrides,
});

test("rejects unsafe origins and request paths", async () => {
  for (const origin of ["http://api.example.test", "https://user:pass@api.example.test",
    "https://api.example.test/extra", "https://api.example.test?x=1"]) {
    assert.throws(() => transport({ origin }));
  }
  for (const path of ["https://evil.test/pay", "//evil.test/pay", "/pay?secret=x",
    "/pay#frag", "/pay\\evil", "/%2f%2fevil"]) {
    await assert.rejects(transport().request({ path }), TypeError);
  }
});

test("uses pinned origin, bearer token, no redirects and no-store", async () => {
  let call;
  const t = transport({
    fetchImpl: async (url, options) => { call = { url, options }; return ok(); },
  });
  assert.deepEqual(await t.request({ path: "/v1/sandbox", method: "POST", body: { amount: 30 } }), { ok: true });
  assert.equal(call.url, "https://api.sandbox.example.test/v1/sandbox");
  assert.equal(call.options.headers.Authorization, "Bearer a-very-long-test-token");
  assert.equal(call.options.redirect, "error");
  assert.equal(call.options.cache, "no-store");
  assert.equal(call.options.body, '{"amount":30}');
});

test("coalesces parallel token refresh and caches valid token", async () => {
  let count = 0;
  const t = transport({ tokenSupplier: async () => { count++; return goodToken(); } });
  await Promise.all([t.request({ path: "/a" }), t.request({ path: "/b" })]);
  await t.request({ path: "/c" });
  assert.equal(count, 1);
});

test("invalid or stale token fails closed without making request", async () => {
  let called = false;
  const t = transport({
    tokenSupplier: () => ({ token: "short", expiresAtMs: Date.now() + 60000 }),
    fetchImpl: async () => { called = true; return ok(); },
  });
  await assert.rejects(t.request({ path: "/v1" }), (err) =>
    err instanceof AzamPayTransportError && err.code === "INVALID_PROVIDER_TOKEN");
  assert.equal(called, false);
});

test("rejects non-successful provider responses and clears cached token after 401", async () => {
  let count = 0;
  const t = transport({
    tokenSupplier: () => { count++; return goodToken(); },
    fetchImpl: async () => ({ status: count === 1 ? 401 : 200, text: async () => "{}" }),
  });
  await assert.rejects(t.request({ path: "/v1" }), (err) => err.code === "PROVIDER_HTTP_ERROR");
  await t.request({ path: "/v1" });
  assert.equal(count, 2);
});

test("HTTP errors expose only the status code, never the provider body", async () => {
  const t = transport({
    fetchImpl: async () => ({ status: 400, text: async () => "payer 255700000000 secret" }),
  });
  await assert.rejects(t.request({ path: "/v1", method: "POST", body: {} }), (err) =>
    err instanceof AzamPayTransportError && err.code === "PROVIDER_HTTP_ERROR" &&
    err.httpStatus === 400 && !err.message.includes("secret"));
});

test("optional X-API-Key header is sent with the bearer token; bad keys refused", async () => {
  let headers;
  const t = transport({
    apiKey: "portal-api-key",
    fetchImpl: async (url, options) => { headers = options.headers; return ok(); },
  });
  await t.request({ path: "/v1" });
  assert.equal(headers["X-API-Key"], "portal-api-key");
  assert.equal(headers.Authorization, "Bearer a-very-long-test-token");
  for (const apiKey of ["", "ab", "line\nbreak", 42]) {
    assert.throws(() => transport({ apiKey }), TypeError);
  }
  await transport({ fetchImpl: async (url, options) => { headers = options.headers; return ok(); } })
    .request({ path: "/v1" });
  assert.equal("X-API-Key" in headers, false);
});

test("prepare fetches the token once without calling the API", async () => {
  let tokens = 0;
  let calls = 0;
  const t = transport({
    tokenSupplier: async () => { tokens++; return goodToken(); },
    fetchImpl: async () => { calls++; return ok(); },
  });
  await t.prepare();
  assert.equal(tokens, 1);
  assert.equal(calls, 0);
  await t.request({ path: "/v1" });
  assert.equal(tokens, 1);
  assert.equal(calls, 1);
});

test("rejects invalid JSON and excessive responses", async () => {
  await assert.rejects(
    transport({ fetchImpl: async () => ({ status: 200, text: async () => "not json" }) }).request({ path: "/v1" }),
    (err) => err.code === "INVALID_PROVIDER_JSON",
  );
  await assert.rejects(
    transport({ fetchImpl: async () => ({ status: 200, text: async () => "x".repeat(300000) }) }).request({ path: "/v1" }),
    (err) => err.code === "PROVIDER_RESPONSE_TOO_LARGE",
  );
});

test("GET bodies and unsupported verbs are rejected", async () => {
  await assert.rejects(transport().request({ path: "/v1", method: "DELETE" }), TypeError);
  await assert.rejects(transport().request({ path: "/v1", method: "GET", body: {} }), TypeError);
});

test("network errors do not leak raw URLs or tokens", async () => {
  const t = transport({
    fetchImpl: async () => { throw new Error("sensitive-token-customer-data"); },
  });
  await assert.rejects(t.request({ path: "/v1" }), (err) =>
    err.code === "PROVIDER_NETWORK_ERROR" && !err.message.includes("sensitive"));
});
