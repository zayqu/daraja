import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, sign, verify } from "node:crypto";
import { createAzamPayPublicKeyProvider } from "../lib/payments/azampay-public-key.mjs";
const makeKey = () => generateKeyPairSync("rsa", { modulusLength: 2048 });
const first = makeKey();
const second = makeKey();
const pem = (pair) => pair.publicKey.export({ type: "spki", format: "pem" });

test("no production or unauthenticated key client allowed", () => {
  assert.throws(() => createAzamPayPublicKeyProvider({}), /PUBLIC_KEY_PROVIDER_NOT_CONFIGURED/);
  assert.throws(() => createAzamPayPublicKeyProvider({
    apiClient: { mode: "production", request: async () => ({ success: true, publicKey: pem(first) }) },
  }), /PUBLIC_KEY_PROVIDER_NOT_CONFIGURED/);
});

test("fetches authenticated sandbox key only at pinned path and caches for 24h", async () => {
  const calls = [];
  let now = 1_000_000;
  const provider = createAzamPayPublicKeyProvider({
    apiClient: {
      mode: "sandbox",
      request: async (args) => {
        calls.push(args);
        return { success: true, publicKey: pem(first) };
      },
    },
    now: () => now,
  });
  const [a, b] = await Promise.all([provider.getPublicKey(), provider.getPublicKey()]);
  assert.equal(a, b);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], { path: "/azampay/v1/public-key", method: "GET" });
  await provider.getPublicKey();
  assert.equal(calls.length, 1);
  now += 24 * 60 * 60 * 1000 + 1;
  await provider.getPublicKey();
  assert.equal(calls.length, 2);
});

test("rejects invalid key material and short RSA keys", async () => {
  const tooSmall = generateKeyPairSync("rsa", { modulusLength: 1024 });
  for (const value of ["not a key", pem(tooSmall), "", undefined]) {
    const provider = createAzamPayPublicKeyProvider({
      apiClient: { mode: "sandbox", request: async () => ({ success: true, publicKey: value }) },
    });
    await assert.rejects(provider.getPublicKey(), /PUBLIC_KEY_RESPONSE_INVALID/);
  }
});

test("refreshes exactly once after failed signature and accepts only verified replacement", async () => {
  let count = 0;
  const provider = createAzamPayPublicKeyProvider({
    apiClient: {
      mode: "sandbox",
      request: async () => ({ success: true, publicKey: pem(++count === 1 ? first : second) }),
    },
  });
  const message = "only-original-message";
  const signature = sign("RSA-SHA256", Buffer.from(message), second.privateKey);
  const result = await provider.verifyWithRefresh((key) =>
    verify("RSA-SHA256", Buffer.from(message), key, signature));
  assert.equal(result, true);
  assert.equal(count, 2);
  assert.equal(await provider.verifyWithRefresh(() => true), true);
  assert.equal(count, 2);
});

test("invalid signature never passes even after refresh", async () => {
  let count = 0;
  const provider = createAzamPayPublicKeyProvider({
    apiClient: {
      mode: "sandbox",
      request: async () => { count++; return { success: true, publicKey: pem(first) }; },
    },
  });
  assert.equal(await provider.verifyWithRefresh(() => false), false);
  assert.equal(count, 2);
});

test("does not accept unsigned success or ignore failed refresh", async () => {
  let calls = 0;
  const provider = createAzamPayPublicKeyProvider({
    apiClient: {
      mode: "sandbox",
      request: async () => ++calls === 1
        ? { success: true, publicKey: pem(first) }
        : { success: false },
    },
  });
  await assert.rejects(provider.verifyWithRefresh(() => false), /PUBLIC_KEY_RESPONSE_INVALID/);
  assert.equal(calls, 2);
});
