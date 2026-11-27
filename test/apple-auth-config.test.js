const test = require("node:test");
const assert = require("node:assert/strict");
const { inspectAppleEnvironment } = require("../scripts/check-apple-auth-config.cjs");

function formatOnlyJwt({ sub = "tz.daraja.web", expOffset = 60 * 86400 } = {}) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "ES256", kid: "TEST_KEY" };
  const claims = {
    iss: "TEST_TEAM",
    aud: "https://appleid.apple.com",
    sub,
    iat: now,
    exp: now + expOffset,
  };
  // This is deliberately NOT a signed JWT. It exercises syntax inspection only.
  return [
    Buffer.from(JSON.stringify(header)).toString("base64url"),
    Buffer.from(JSON.stringify(claims)).toString("base64url"),
    "not-a-real-signature",
  ].join(".");
}

test("Apple configuration remains safely disabled by default", () => {
  const result = inspectAppleEnvironment({});
  assert.equal(result.disabled, true);
  assert.equal(result.ready, false);
  assert.deepEqual(result.issues, []);
});

test("enabled Apple configuration refuses missing or malformed environment", () => {
  const result = inspectAppleEnvironment({
    AUTH_APPLE_ENABLED: "true",
    AUTH_APPLE_ID: "tz.daraja.web",
    AUTH_APPLE_SECRET: "not-jwt",
    AUTH_URL: "http://localhost:3000",
  });
  assert.equal(result.ready, false);
  assert.ok(result.issues.some((issue) => issue.includes("JWT")));
  assert.ok(result.issues.some((issue) => issue.includes("HTTPS")));
});

test("Apple configuration requires correct service id and an unexpired JWT format", () => {
  const env = {
    AUTH_APPLE_ENABLED: "true",
    AUTH_APPLE_ID: "tz.daraja.web",
    AUTH_APPLE_SECRET: formatOnlyJwt(),
    AUTH_URL: "https://ajira.daraja.co.tz",
  };
  const formatOk = inspectAppleEnvironment(env);
  assert.equal(formatOk.ready, true, "Format check only: NOT a verified Apple signature");

  const differentId = inspectAppleEnvironment({ ...env, AUTH_APPLE_ID: "other.service.id" });
  assert.equal(differentId.ready, false);
  assert.ok(differentId.issues.some((issue) => issue.includes("Services ID")));

  const expired = inspectAppleEnvironment({ ...env, AUTH_APPLE_SECRET: formatOnlyJwt({ expOffset: -1 }) });
  assert.equal(expired.ready, false);
  assert.ok(expired.issues.some((issue) => issue.includes("expired")));
});

test("Apple environment diagnostics never include client-secret material", () => {
  const secret = formatOnlyJwt();
  const result = inspectAppleEnvironment({
    AUTH_APPLE_ENABLED: "true",
    AUTH_APPLE_ID: "other.service.id",
    AUTH_APPLE_SECRET: secret,
    AUTH_URL: "https://ajira.daraja.co.tz",
  });
  assert.equal(JSON.stringify(result).includes(secret), false);
});
