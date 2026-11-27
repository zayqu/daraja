#!/usr/bin/env node
"use strict";

// Safe, offline readiness inspection. Never prints a credential or token.
// This is NOT cryptographic verification; a real Apple sign-in test is required.
const { URL } = require("node:url");

function inspectAppleEnvironment(env = process.env) {
  if (env.AUTH_APPLE_ENABLED !== "true") {
    return { ready: false, disabled: true, issues: [] };
  }

  const issues = [];
  const id = (env.AUTH_APPLE_ID || "").trim();
  const token = (env.AUTH_APPLE_SECRET || "").trim();
  if (!id || id.length > 255 || /\s/.test(id)) {
    issues.push("Apple web Services ID is missing or invalid");
  }
  if (!token) {
    issues.push("Signed Apple client secret is missing");
  } else {
    const parts = token.split(".");
    if (parts.length !== 3 || parts.some((part) => !part)) {
      issues.push("Apple client secret is not a JWT");
    } else {
      try {
        const header = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
        const body = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
        if (header.alg !== "ES256" || !header.kid) issues.push("Apple client-secret JWT header is invalid");
        if (body.aud !== "https://appleid.apple.com" || !body.iss || (id && body.sub !== id)) {
          issues.push("Apple client-secret JWT claims do not match the Services ID");
        }
        const now = Math.floor(Date.now() / 1000);
        if (!Number.isSafeInteger(body.iat) || !Number.isSafeInteger(body.exp) ||
          body.iat > now + 60 || body.exp <= now + 7 * 86400 ||
          body.exp - body.iat > 15_777_000) {
          issues.push("Apple client-secret JWT is expired, near expiry, or has invalid lifetime");
        }
      } catch {
        issues.push("Apple client-secret JWT could not be parsed");
      }
    }
  }

  const origin = env.AUTH_URL || env.NEXTAUTH_URL || "";
  try {
    const parsed = new URL(origin);
    if (parsed.protocol !== "https:" || parsed.username || parsed.password ||
      parsed.search || parsed.hash || parsed.pathname !== "/" || !parsed.hostname) {
      issues.push("Authentication origin must be a clean HTTPS website URL");
    }
  } catch {
    issues.push("AUTH_URL or NEXTAUTH_URL is missing or invalid");
  }

  return { ready: issues.length === 0, disabled: false, issues };
}

if (require.main === module) {
  const outcome = inspectAppleEnvironment();
  if (outcome.disabled) {
    process.stdout.write("Apple Sign In: disabled (expected until credentials and provider are verified).\n");
  } else if (!outcome.ready) {
    for (const issue of outcome.issues) process.stderr.write("Apple Sign In: " + issue + "\n");
    process.exitCode = 1;
  } else {
    process.stdout.write("Apple Sign In: environment format checked. Real provider verification still required.\n");
  }
}

module.exports = { inspectAppleEnvironment };
