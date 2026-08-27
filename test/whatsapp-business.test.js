const test = require("node:test");
const assert = require("node:assert/strict");

const {
  inspectWhatsAppSandboxConfiguration,
  sendWhatsAppSandboxTemplate,
  WhatsAppSandboxError,
} = require("../scraper/lib/whatsapp-business");

const verifiedAt = "2026-08-02T09:00:00.000Z";
const now = new Date("2026-08-02T10:00:00.000Z");
const safeEnv = {
  WHATSAPP_SANDBOX_TRANSPORT_ENABLED: "true",
  WHATSAPP_SANDBOX_VERIFIED: "true",
  WHATSAPP_SANDBOX_WEBHOOK_VERIFIED: "true",
  WHATSAPP_SANDBOX_EVIDENCE_ID: "meta-sandbox-e2e-20260802",
  WHATSAPP_SANDBOX_WEBHOOK_EVIDENCE_ID: "meta-webhook-status-20260802",
  WHATSAPP_SANDBOX_VERIFIED_AT: verifiedAt,
  WHATSAPP_GRAPH_API_VERSION: "v25.0",
  WHATSAPP_PHONE_NUMBER_ID: "123456789012345",
  WHATSAPP_ACCESS_TOKEN: "test-token-not-a-secret",
  WHATSAPP_TEMPLATE_NAME: "daraja_job_alert_test",
  WHATSAPP_TEMPLATE_LANGUAGE: "en_US",
  WHATSAPP_TEST_RECIPIENT: "255700000000",
};

test("WhatsApp sandbox stays blocked until every credential and evidence gate passes", () => {
  const inspection = inspectWhatsAppSandboxConfiguration({}, now);

  assert.equal(inspection.ready, false);
  assert.ok(inspection.reasons.length >= 9);
  assert.equal(inspection.evidenceId, null);
  assert.equal(inspection.webhookEvidenceId, null);
  assert.equal(inspection.verifiedAt, null);
});

test("WhatsApp sandbox configuration failure prevents every HTTP request", async () => {
  let called = false;
  await assert.rejects(
    sendWhatsAppSandboxTemplate({
      recipient: safeEnv.WHATSAPP_TEST_RECIPIENT,
      env: {},
      now,
      fetchFn: async () => {
        called = true;
      },
    }),
    (error) => error.code === "CONFIGURATION_BLOCKED",
  );
  assert.equal(called, false);
});

test("WhatsApp sandbox rejects future or malformed evidence", () => {
  assert.equal(inspectWhatsAppSandboxConfiguration({
    ...safeEnv,
    WHATSAPP_SANDBOX_VERIFIED_AT: "2026-08-02T11:00:00.000Z",
  }, now).ready, false);
  assert.equal(inspectWhatsAppSandboxConfiguration({
    ...safeEnv,
    WHATSAPP_SANDBOX_EVIDENCE_ID: "bad evidence with spaces",
  }, now).ready, false);
  assert.equal(inspectWhatsAppSandboxConfiguration({
    ...safeEnv,
    WHATSAPP_SANDBOX_VERIFIED_AT: "2025-12-01T10:00:00.000Z",
  }, now).ready, false);
  assert.equal(inspectWhatsAppSandboxConfiguration({
    ...safeEnv,
    WHATSAPP_SANDBOX_WEBHOOK_VERIFIED: "false",
  }, now).ready, false);
  assert.equal(inspectWhatsAppSandboxConfiguration({
    ...safeEnv,
    WHATSAPP_SANDBOX_WEBHOOK_EVIDENCE_ID: "bad webhook evidence",
  }, now).ready, false);
});

test("WhatsApp sandbox never calls Meta for an unverified recipient", async () => {
  let called = false;

  await assert.rejects(
    sendWhatsAppSandboxTemplate({
      recipient: "255711111111",
      parameters: ["2", "Technology"],
      env: safeEnv,
      now,
      fetchFn: async () => {
        called = true;
      },
    }),
    (error) => error instanceof WhatsAppSandboxError && error.code === "RECIPIENT_BLOCKED",
  );
  assert.equal(called, false);
});

test("WhatsApp sandbox sends only an approved template to the exact test recipient", async () => {
  let request;
  const result = await sendWhatsAppSandboxTemplate({
    recipient: safeEnv.WHATSAPP_TEST_RECIPIENT,
    parameters: ["2", "Technology"],
    env: safeEnv,
    now,
    fetchFn: async (url, options) => {
      request = { url, options };
      return {
        ok: true,
        status: 200,
        json: async () => ({ messages: [{ id: "wamid.test-message-id" }] }),
      };
    },
  });

  assert.equal(
    request.url,
    "https://graph.facebook.com/v25.0/123456789012345/messages",
  );
  assert.equal(request.options.method, "POST");
  assert.equal(
    request.options.headers.Authorization,
    "Bearer test-token-not-a-secret",
  );
  assert.deepEqual(JSON.parse(request.options.body), {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: "255700000000",
    type: "template",
    template: {
      name: "daraja_job_alert_test",
      language: { code: "en_US" },
      components: [{
        type: "body",
        parameters: [
          { type: "text", text: "2" },
          { type: "text", text: "Technology" },
        ],
      }],
    },
  });
  assert.deepEqual(result, {
    messageId: "wamid.test-message-id",
    evidenceId: "meta-sandbox-e2e-20260802",
    webhookEvidenceId: "meta-webhook-status-20260802",
    sandbox: true,
  });
});

test("WhatsApp sandbox sanitizes provider failures and never returns credentials", async () => {
  await assert.rejects(
    sendWhatsAppSandboxTemplate({
      recipient: safeEnv.WHATSAPP_TEST_RECIPIENT,
      env: safeEnv,
      now,
      fetchFn: async () => ({
        ok: false,
        status: 400,
        json: async () => ({
          error: {
            code: 132001,
            message: `secret response ${safeEnv.WHATSAPP_ACCESS_TOKEN}`,
          },
        }),
      }),
    }),
    (error) => {
      assert.equal(error.code, "PROVIDER_REJECTED");
      assert.equal(error.status, 400);
      assert.match(error.message, /provider code 132001/);
      assert.doesNotMatch(error.message, /test-token-not-a-secret|secret response/);
      return true;
    },
  );
});

test("WhatsApp sandbox rejects malformed provider responses deterministically", async () => {
  await assert.rejects(
    sendWhatsAppSandboxTemplate({
      recipient: safeEnv.WHATSAPP_TEST_RECIPIENT,
      env: safeEnv,
      now,
      fetchFn: async () => ({ status: 200 }),
    }),
    (error) => error.code === "INVALID_PROVIDER_RESPONSE",
  );
});

test("WhatsApp sandbox rejects arbitrary or oversized template data before fetch", async () => {
  let called = false;
  await assert.rejects(
    sendWhatsAppSandboxTemplate({
      recipient: safeEnv.WHATSAPP_TEST_RECIPIENT,
      parameters: ["x".repeat(257)],
      env: safeEnv,
      now,
      fetchFn: async () => {
        called = true;
      },
    }),
    (error) => error.code === "INVALID_TEMPLATE_PARAMETERS",
  );
  assert.equal(called, false);

  await assert.rejects(
    sendWhatsAppSandboxTemplate({
      recipient: safeEnv.WHATSAPP_TEST_RECIPIENT,
      parameters: ["unsafe\nvalue"],
      env: safeEnv,
      now,
      fetchFn: async () => {
        called = true;
      },
    }),
    (error) => error.code === "INVALID_TEMPLATE_PARAMETERS",
  );
  assert.equal(called, false);
});

test("WhatsApp sandbox rejects malformed credentials and message identifiers", async () => {
  assert.equal(inspectWhatsAppSandboxConfiguration({
    ...safeEnv,
    WHATSAPP_ACCESS_TOKEN: "unsafe token\nvalue",
  }, now).ready, false);

  await assert.rejects(
    sendWhatsAppSandboxTemplate({
      recipient: safeEnv.WHATSAPP_TEST_RECIPIENT,
      env: safeEnv,
      now,
      fetchFn: async () => ({
        ok: true,
        status: 200,
        json: async () => ({ messages: [{ id: "not-a-whatsapp-message-id" }] }),
      }),
    }),
    (error) => error.code === "INVALID_PROVIDER_RESPONSE",
  );
});
