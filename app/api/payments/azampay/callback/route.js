import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sandboxRoutesAvailable } from "@/lib/payments/azampay-sandbox-gate.mjs";
import { createAzamPayApiClient } from "@/lib/payments/azampay-api-client.mjs";
import { createAzamPayPublicKeyProvider } from "@/lib/payments/azampay-public-key.mjs";
import { processSandboxCallback } from "@/lib/payments/azampay-sandbox-callback.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 16_384;

// One API client (token cache) and one public-key cache per server process.
// AzamPay asks merchants to cache the callback key, refresh it about every
// 24 hours and re-fetch once when a signature fails.
let gateway = null;
function sandboxGateway() {
  if (!gateway) {
    const apiClient = createAzamPayApiClient();
    if (apiClient.mode !== "sandbox") return null;
    gateway = Object.freeze({
      apiClient, keyProvider: createAzamPayPublicKeyProvider({ apiClient }),
    });
  }
  return gateway;
}

function json(payload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

async function readBoundedJson(request) {
  if ((request.headers.get("content-type") || "").split(";")[0].trim().toLowerCase() !==
      "application/json") return null;
  const declared = request.headers.get("content-length");
  if (declared && Number(declared) > MAX_BYTES) return null;
  if (!request.body) return null;
  const chunks = [];
  let size = 0;
  for await (const chunk of request.body) {
    size += chunk.byteLength;
    if (size > MAX_BYTES) {
      await request.body.cancel().catch(() => {});
      return null;
    }
    chunks.push(chunk);
  }
  try {
    const payload = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(
      Buffer.concat(chunks.map(chunk => Buffer.from(chunk))),
    ));
    return payload && !Array.isArray(payload) && typeof payload === "object" ? payload : null;
  } catch {
    return null;
  }
}

export async function POST(request) {
  if (!sandboxRoutesAvailable()) return json({ error: "Not found" }, 404);
  const payload = await readBoundedJson(request);
  if (!payload) return json({ error: "Invalid sandbox callback" }, 400);

  try {
    const sandbox = sandboxGateway();
    if (!sandbox) return json({ error: "Not found" }, 404);
    const result = await processSandboxCallback({
      prisma, apiClient: sandbox.apiClient, keyProvider: sandbox.keyProvider, payload,
      // From authenticated server environment ONLY. Callback clientId is
      // unsigned and cannot be treated as proof of merchant ownership.
      expectedMerchantId: process.env.AZAMPAY_CLIENT_ID,
    });
    return json({ accepted: result.accepted }, 200);
  } catch (error) {
    const invalid = error?.code === "CALLBACK_INVALID" ||
      error?.code === "CALLBACK_SIGNATURE_OR_BINDING_INVALID";
    // Unbound checkout may be an early callback before the authenticated
    // initiation receipt is committed. Return 5xx so the provider can retry.
    // 5xx: potential retryable DB/key issue. Never echo sensitive payload,
    // phone number, token, password, provider error or internal references.
    return json({ error: invalid ? "Unverified callback" : "Callback requires retry or review" },
      invalid ? 401 : 503);
  }
}
