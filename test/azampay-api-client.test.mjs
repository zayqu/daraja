import test from "node:test";
import assert from "node:assert/strict";
import { createAzamPayApiClient } from "../lib/payments/azampay-api-client.mjs";

const NOW = Date.parse("2026-11-10T12:00:00.000Z");
const credentials = {
  AZAMPAY_ENABLED: "true",
  AZAMPAY_MODE: "sandbox",
  AZAMPAY_APP_NAME: "Daraja",
  AZAMPAY_CLIENT_ID: "test-client-id",
  AZAMPAY_CLIENT_SECRET: "test-client-secret",
};
const successAuth = () => ({
  status: 200,
  text: async () => JSON.stringify({
    success: true,
    data: { accessToken: "test-token-long-enough", expire: new Date(NOW + 3600000).toISOString() },
  }),
});

test("disabled, malformed configuration and unapproved production fail closed", () => {
  assert.throws(() => createAzamPayApiClient({ env: {} }), /AZAMPAY_DISABLED/);
  assert.throws(() => createAzamPayApiClient({
    env: { ...credentials, AZAMPAY_MODE: "invalid" },
  }), /AZAMPAY_DISABLED/);
  assert.throws(() => createAzamPayApiClient({
    env: { ...credentials, AZAMPAY_MODE: "production" },
  }), /AZAMPAY_DISABLED/);
  assert.throws(() => createAzamPayApiClient({
    env: { ...credentials, AZAMPAY_CLIENT_SECRET: "" },
  }), /client secret/);
});

test("obtains token on dedicated auth origin and uses it only on checkout origin", async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    if (url.includes("GenerateToken")) return successAuth();
    return { status: 200, text: async () => JSON.stringify({ pending: true }) };
  };
  const client = createAzamPayApiClient({ env: credentials, now: () => NOW, fetchImpl });
  const result = await client.request({ path: "/integration-test" });
  assert.deepEqual(result, { pending: true });
  assert.equal(calls.length, 2);
  assert.equal(calls[0].url, "https://authenticator-sandbox.azampay.co.tz/AppRegistration/GenerateToken");
  assert.equal(calls[1].url, "https://sandbox.azampay.co.tz/integration-test");
  assert.equal(calls[0].options.redirect, "error");
  assert.equal(calls[1].options.headers.Authorization, "Bearer test-token-long-enough");
  assert.equal(calls[1].options.body, undefined);
  assert.equal(calls[0].options.headers.Authorization, undefined);
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    appName: "Daraja", clientId: "test-client-id", clientSecret: "test-client-secret",
  });
});

test("caches token for parallel calls", async () => {
  let authRequests = 0;
  const fetchImpl = async (url) => {
    if (url.includes("GenerateToken")) { authRequests++; return successAuth(); }
    return { status: 200, text: async () => "{}" };
  };
  const client = createAzamPayApiClient({ env: credentials, now: () => NOW, fetchImpl });
  await Promise.all([client.request({ path: "/a" }), client.request({ path: "/b" })]);
  assert.equal(authRequests, 1);
});

test("token response must include authenticated success, token and an unexpired expiry", async () => {
  const bad = [
    { success: false, data: { accessToken: "test-token-long-enough" } },
    { success: true, data: {} },
    { success: true, data: { accessToken: 12345 } },
    { success: true, data: { accessToken: "test-token-long-enough", expire: new Date(NOW + 100).toISOString() } },
    { success: true, data: { accessToken: "test-token-long-enough", expire: new Date(NOW - 60000).toISOString() } },
  ];
  for (const response of bad) {
    let checkoutCalls = 0;
    const client = createAzamPayApiClient({
      env: credentials, now: () => NOW,
      fetchImpl: async (url) => {
        if (!url.includes("GenerateToken")) checkoutCalls++;
        return { status: 200, text: async () => JSON.stringify(response) };
      },
    });
    await assert.rejects(client.request({ path: "/anything" }));
    assert.equal(checkoutCalls, 0);
  }
});

test("undocumented expiry formats never guess a timezone: short local lifetime, one-hour cap", async () => {
  const cases = [
    ["missing", () => undefined, 5],
    ["unreadable", () => "not-a-date", 5],
    ["zone-less ISO", () => "2026-11-10T13:00:00", 5],
    ["zone-less space", () => "2026-11-10 13:00:00", 5],
    ["explicit 10 min", (clock) => new Date(clock + 10 * 60000).toISOString(), 10],
    ["explicit 6 h", (clock) => new Date(clock + 6 * 3600000).toISOString(), 60],
  ];
  for (const [label, expire, minutes] of cases) {
    let clock = NOW;
    let authRequests = 0;
    const client = createAzamPayApiClient({
      env: credentials, now: () => clock,
      fetchImpl: async (url) => {
        if (!url.includes("GenerateToken")) return { status: 200, text: async () => "{}" };
        authRequests++;
        return { status: 200, text: async () => JSON.stringify({
          success: true, data: { accessToken: "test-token-long-enough", expire: expire(clock) },
        }) };
      },
    });
    await client.request({ path: "/a" });
    // Reused until 30 s before the chosen lifetime ends, then refreshed.
    clock = NOW + minutes * 60000 - 31000;
    await client.request({ path: "/b" });
    assert.equal(authRequests, 1, `reuse: ${label}`);
    clock = NOW + minutes * 60000 - 29000;
    await client.request({ path: "/c" });
    assert.equal(authRequests, 2, `refresh: ${label}`);
  }
});

test("X-API-Key goes only to the checkout origin, as in AzamPay's checkout sample", async () => {
  const calls = [];
  const client = createAzamPayApiClient({
    env: { ...credentials, AZAMPAY_API_KEY: "portal-issued-key" }, now: () => NOW,
    fetchImpl: async (url, options) => {
      calls.push({ url, headers: options.headers });
      if (url.includes("GenerateToken")) return successAuth();
      return { status: 200, text: async () => "{}" };
    },
  });
  await client.request({ path: "/azampay/mno/checkout", method: "POST", body: { amount: 1 } });
  assert.equal(calls[0].headers["X-API-Key"], undefined);
  assert.equal(calls[1].headers["X-API-Key"], "portal-issued-key");
  assert.equal(calls[1].headers.Authorization, "Bearer test-token-long-enough");
  // Unset or blank key: no header at all.
  const plain = [];
  const noKey = createAzamPayApiClient({
    env: { ...credentials, AZAMPAY_API_KEY: "" }, now: () => NOW,
    fetchImpl: async (url, options) => {
      plain.push(options.headers);
      return url.includes("GenerateToken") ? successAuth() : { status: 200, text: async () => "{}" };
    },
  });
  await noKey.request({ path: "/x" });
  assert.equal(plain.some(h => "X-API-Key" in h), false);
});

test("prepare obtains the token without calling the checkout API", async () => {
  const urls = [];
  const client = createAzamPayApiClient({
    env: credentials, now: () => NOW,
    fetchImpl: async (url) => {
      urls.push(url);
      return url.includes("GenerateToken") ? successAuth() : { status: 200, text: async () => "{}" };
    },
  });
  await client.prepare();
  assert.deepEqual(urls, ["https://authenticator-sandbox.azampay.co.tz/AppRegistration/GenerateToken"]);
  await client.request({ path: "/after" });
  assert.equal(urls.length, 2);
  const failing = createAzamPayApiClient({
    env: credentials, now: () => NOW,
    fetchImpl: async () => ({ status: 423, text: async () => "{}" }),
  });
  await assert.rejects(failing.prepare(), /TOKEN_HTTP_ERROR/);
});

test("rejected token, invalid provider JSON and network errors remain sanitized", async () => {
  for (const result of [
    async () => ({ status: 401, text: async () => "sensitive-payment-data" }),
    async () => ({ status: 200, text: async () => "invalid json" }),
    async () => { throw new Error("private clientSecret should never appear"); },
  ]) {
    const client = createAzamPayApiClient({
      env: credentials, now: () => NOW, fetchImpl: result,
    });
    await assert.rejects(client.request({ path: "/anything" }), (error) =>
      !error.message.includes("private") && !error.message.includes("sensitive"));
  }
});

test("production transport uses distinct origins only with explicit authorization", async () => {
  const calls = [];
  const client = createAzamPayApiClient({
    env: { ...credentials, AZAMPAY_MODE: "production", AZAMPAY_PRODUCTION_APPROVED: "true" },
    now: () => NOW,
    fetchImpl: async (url) => {
      calls.push(url);
      if (url.includes("GenerateToken")) return successAuth();
      return { status: 200, text: async () => "{}" };
    },
  });
  await client.request({ path: "/test-path" });
  assert.equal(calls[0], "https://authenticator.azampay.co.tz/AppRegistration/GenerateToken");
  assert.equal(calls[1], "https://checkout.azampay.co.tz/test-path");
});
