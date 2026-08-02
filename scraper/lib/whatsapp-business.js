const GRAPH_API_ORIGIN = "https://graph.facebook.com";
const DEFAULT_TIMEOUT_MS = 10_000;
const MAX_TEMPLATE_PARAMETERS = 10;
const MAX_PARAMETER_LENGTH = 256;

class WhatsAppSandboxError extends Error {
  constructor(message, { code = "WHATSAPP_SANDBOX_ERROR", status = null } = {}) {
    super(message);
    this.name = "WhatsAppSandboxError";
    this.code = code;
    this.status = status;
  }
}

function isSafeEvidenceId(value) {
  return /^[A-Za-z0-9._:-]{6,120}$/.test(value || "");
}

function isValidPastTimestamp(value, now) {
  if (!value) return false;
  const timestamp = Date.parse(value);
  return (
    Number.isFinite(timestamp) &&
    new Date(timestamp).toISOString() === value &&
    timestamp <= now.getTime()
  );
}

function inspectWhatsAppSandboxConfiguration(env = process.env, now = new Date()) {
  const reasons = [];
  const enabled = env.WHATSAPP_BUSINESS_ENABLED === "true";
  const sandboxVerified = env.WHATSAPP_SANDBOX_VERIFIED === "true";

  if (!enabled) reasons.push("WHATSAPP_BUSINESS_ENABLED must be true");
  if (!sandboxVerified) reasons.push("WHATSAPP_SANDBOX_VERIFIED must be true");
  if (!isSafeEvidenceId(env.WHATSAPP_SANDBOX_EVIDENCE_ID)) {
    reasons.push("WHATSAPP_SANDBOX_EVIDENCE_ID is missing or invalid");
  }
  if (!isValidPastTimestamp(env.WHATSAPP_SANDBOX_VERIFIED_AT, now)) {
    reasons.push("WHATSAPP_SANDBOX_VERIFIED_AT must be a valid past timestamp");
  }
  if (!/^v\d+\.\d+$/.test(env.WHATSAPP_GRAPH_API_VERSION || "")) {
    reasons.push("WHATSAPP_GRAPH_API_VERSION is missing or invalid");
  }
  if (!/^\d{5,30}$/.test(env.WHATSAPP_PHONE_NUMBER_ID || "")) {
    reasons.push("WHATSAPP_PHONE_NUMBER_ID is missing or invalid");
  }
  if (!env.WHATSAPP_ACCESS_TOKEN) {
    reasons.push("WHATSAPP_ACCESS_TOKEN is missing");
  }
  if (!/^[a-z0-9_]{1,512}$/.test(env.WHATSAPP_TEMPLATE_NAME || "")) {
    reasons.push("WHATSAPP_TEMPLATE_NAME is missing or invalid");
  }
  if (!/^[a-z]{2,3}(?:_[A-Z]{2})?$/.test(env.WHATSAPP_TEMPLATE_LANGUAGE || "")) {
    reasons.push("WHATSAPP_TEMPLATE_LANGUAGE is missing or invalid");
  }
  if (!/^[1-9]\d{7,14}$/.test(env.WHATSAPP_TEST_RECIPIENT || "")) {
    reasons.push("WHATSAPP_TEST_RECIPIENT is missing or invalid");
  }

  return {
    ready: reasons.length === 0,
    reasons,
    evidenceId: isSafeEvidenceId(env.WHATSAPP_SANDBOX_EVIDENCE_ID)
      ? env.WHATSAPP_SANDBOX_EVIDENCE_ID
      : null,
    verifiedAt: isValidPastTimestamp(env.WHATSAPP_SANDBOX_VERIFIED_AT, now)
      ? env.WHATSAPP_SANDBOX_VERIFIED_AT
      : null,
  };
}

function requireTemplateParameters(parameters) {
  if (!Array.isArray(parameters) || parameters.length > MAX_TEMPLATE_PARAMETERS) {
    throw new WhatsAppSandboxError(
      `Template parameters must be an array with no more than ${MAX_TEMPLATE_PARAMETERS} entries.`,
      { code: "INVALID_TEMPLATE_PARAMETERS" },
    );
  }

  return parameters.map((value) => {
    if (typeof value !== "string") {
      throw new WhatsAppSandboxError("Every template parameter must be text.", {
        code: "INVALID_TEMPLATE_PARAMETERS",
      });
    }
    const text = value.trim();
    if (!text || text.length > MAX_PARAMETER_LENGTH) {
      throw new WhatsAppSandboxError(
        `Template parameters must contain 1 to ${MAX_PARAMETER_LENGTH} characters.`,
        { code: "INVALID_TEMPLATE_PARAMETERS" },
      );
    }
    return { type: "text", text };
  });
}

function providerFailure(response, payload) {
  const providerCode = Number.isInteger(payload?.error?.code)
    ? `, provider code ${payload.error.code}`
    : "";
  return new WhatsAppSandboxError(
    `WhatsApp provider rejected the sandbox request (HTTP ${response.status}${providerCode}).`,
    { code: "PROVIDER_REJECTED", status: response.status },
  );
}

async function sendWhatsAppSandboxTemplate({
  recipient,
  parameters = [],
  fetchFn = fetch,
  env = process.env,
  now = new Date(),
  timeoutMs = DEFAULT_TIMEOUT_MS,
}) {
  const inspection = inspectWhatsAppSandboxConfiguration(env, now);
  if (!inspection.ready) {
    throw new WhatsAppSandboxError(
      `WhatsApp sandbox delivery is disabled: ${inspection.reasons.join("; ")}.`,
      { code: "CONFIGURATION_BLOCKED" },
    );
  }
  if (recipient !== env.WHATSAPP_TEST_RECIPIENT) {
    throw new WhatsAppSandboxError(
      "WhatsApp sandbox delivery is restricted to the verified test recipient.",
      { code: "RECIPIENT_BLOCKED" },
    );
  }
  if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 30_000) {
    throw new WhatsAppSandboxError("WhatsApp request timeout is invalid.", {
      code: "INVALID_TIMEOUT",
    });
  }

  const templateParameters = requireTemplateParameters(parameters);
  const body = {
    messaging_product: "whatsapp",
    to: recipient,
    type: "template",
    template: {
      name: env.WHATSAPP_TEMPLATE_NAME,
      language: { code: env.WHATSAPP_TEMPLATE_LANGUAGE },
      ...(templateParameters.length
        ? { components: [{ type: "body", parameters: templateParameters }] }
        : {}),
    },
  };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let response;

  try {
    response = await fetchFn(
      `${GRAPH_API_ORIGIN}/${env.WHATSAPP_GRAPH_API_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      },
    );
  } catch (error) {
    const timedOut = controller.signal.aborted;
    throw new WhatsAppSandboxError(
      timedOut
        ? "WhatsApp sandbox request timed out."
        : "WhatsApp sandbox request could not reach the provider.",
      { code: timedOut ? "PROVIDER_TIMEOUT" : "PROVIDER_UNREACHABLE" },
    );
  } finally {
    clearTimeout(timer);
  }

  if (
    !response ||
    typeof response.ok !== "boolean" ||
    !Number.isInteger(response.status) ||
    typeof response.json !== "function"
  ) {
    throw new WhatsAppSandboxError(
      "WhatsApp provider returned an invalid HTTP response.",
      { code: "INVALID_PROVIDER_RESPONSE" },
    );
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw providerFailure(response, payload);

  const messageId = payload?.messages?.[0]?.id;
  if (typeof messageId !== "string" || !messageId || messageId.length > 500) {
    throw new WhatsAppSandboxError(
      "WhatsApp provider response did not include a valid message identifier.",
      { code: "INVALID_PROVIDER_RESPONSE", status: response.status },
    );
  }

  return {
    messageId,
    evidenceId: inspection.evidenceId,
    sandbox: true,
  };
}

module.exports = {
  inspectWhatsAppSandboxConfiguration,
  sendWhatsAppSandboxTemplate,
  WhatsAppSandboxError,
};
