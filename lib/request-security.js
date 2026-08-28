import { NextResponse } from "next/server";

const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_LIMIT = 60;
const DEFAULT_MAX_BYTES = 16_384;
const MAX_TRACKED_BUCKETS = 5_000;

const rateBuckets = globalThis.__darajaMutationRateBuckets || new Map();
globalThis.__darajaMutationRateBuckets = rateBuckets;

function jsonError(message, status, headers = {}) {
  return NextResponse.json(
    { error: message },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        ...headers,
      },
    }
  );
}

function firstHeaderValue(value) {
  return typeof value === "string" ? value.split(",")[0].trim() : "";
}

function expectedOrigin(request) {
  const url = new URL(request.url);
  const host =
    firstHeaderValue(request.headers.get("x-forwarded-host")) ||
    firstHeaderValue(request.headers.get("host")) ||
    url.host;
  const protocol =
    firstHeaderValue(request.headers.get("x-forwarded-proto")) ||
    url.protocol.replace(":", "");
  return `${protocol}://${host}`;
}

function requestIdentity(request) {
  const raw =
    firstHeaderValue(request.headers.get("cf-connecting-ip")) ||
    firstHeaderValue(request.headers.get("x-real-ip")) ||
    firstHeaderValue(request.headers.get("x-forwarded-for")) ||
    "unknown";
  return raw.replace(/[^0-9a-fA-F:.,_-]/g, "").slice(0, 80) || "unknown";
}

function sweepExpiredBuckets(now) {
  if (rateBuckets.size <= MAX_TRACKED_BUCKETS) return;
  for (const [key, bucket] of rateBuckets) {
    if (bucket.resetAt <= now) rateBuckets.delete(key);
    if (rateBuckets.size <= MAX_TRACKED_BUCKETS) break;
  }
}

function checkRateLimit(request, { scope, limit, windowMs }) {
  const now = Date.now();
  sweepExpiredBuckets(now);

  const key = `${scope}:${requestIdentity(request)}`;
  const existing = rateBuckets.get(key);
  const bucket = !existing || existing.resetAt <= now
    ? { count: 0, resetAt: now + windowMs }
    : existing;

  if (bucket.count >= limit) {
    const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    return jsonError("Too many requests. Please try again shortly.", 429, {
      "Retry-After": String(retryAfter),
    });
  }

  bucket.count += 1;
  rateBuckets.set(key, bucket);
  return null;
}

export function protectMutation(
  request,
  {
    scope = "protected-write",
    limit = DEFAULT_LIMIT,
    windowMs = DEFAULT_WINDOW_MS,
  } = {}
) {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site") {
    return jsonError("Cross-site request rejected.", 403);
  }

  const origin = request.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).origin !== expectedOrigin(request)) {
        return jsonError("Cross-site request rejected.", 403);
      }
    } catch {
      return jsonError("Invalid request origin.", 403);
    }
  }

  return checkRateLimit(request, { scope, limit, windowMs });
}

export async function readJsonBody(request, { maxBytes = DEFAULT_MAX_BYTES } = {}) {
  const mediaType = (request.headers.get("content-type") || "")
    .split(";")[0]
    .trim()
    .toLowerCase();

  if (mediaType !== "application/json" && !mediaType.endsWith("+json")) {
    return {
      error: jsonError("Content-Type must be application/json.", 415),
    };
  }

  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    return { error: jsonError("Request is too large.", 413) };
  }

  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > maxBytes) {
    return { error: jsonError("Request is too large.", 413) };
  }

  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return { error: jsonError("Request body must contain valid JSON.", 400) };
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { error: jsonError("Request body must be a JSON object.", 400) };
  }

  return { body };
}

export async function readProtectedJson(request, options = {}) {
  const error = protectMutation(request, options);
  if (error) return { error };
  return readJsonBody(request, options);
}
