// Pure password and session helpers (no database, no framework imports), so
// they can be unit tested directly. lib/password-auth.js builds on them.

import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);
const SCRYPT = { N: 16384, r: 8, p: 1, keyLength: 64 };

export function normalizeEmail(value) {
  const email = String(value || "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254 ? email : "";
}

export function passwordProblem(password) {
  const value = String(password || "");
  if (value.length < 8) return "Use at least 8 characters.";
  if (value.length > 128) return "Use 128 characters or fewer.";
  if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) {
    return "Use letters and at least one number.";
  }
  return null;
}

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const key = await scryptAsync(String(password), salt, SCRYPT.keyLength, {
    N: SCRYPT.N,
    r: SCRYPT.r,
    p: SCRYPT.p,
  });
  return ["scrypt", SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString("base64"), key.toString("base64")].join("$");
}

// A fixed hash so unknown emails cost the same time as wrong passwords.
const DUMMY_HASH =
  "scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$" + Buffer.alloc(64).toString("base64");

export async function verifyPassword(password, stored) {
  const parts = String(stored || DUMMY_HASH).split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, N, r, p, salt, expected] = parts;
  const expectedKey = Buffer.from(expected, "base64");
  const key = await scryptAsync(String(password || ""), Buffer.from(salt, "base64"), expectedKey.length, {
    N: Number(N),
    r: Number(r),
    p: Number(p),
  });
  return stored ? timingSafeEqual(key, expectedKey) : false;
}

// Matches how Auth.js names its session cookie: the __Secure- prefix is used
// whenever the site is served over https.
export function sessionCookieName(request) {
  const configured = process.env.AUTH_URL || process.env.NEXTAUTH_URL || "";
  const forwarded = (request.headers.get("x-forwarded-proto") || "").split(",")[0].trim();
  let protocol = "";
  try {
    protocol = configured ? new URL(configured).protocol : "";
  } catch {
    protocol = "";
  }
  if (!protocol) protocol = forwarded ? `${forwarded}:` : new URL(request.url).protocol;
  return protocol === "https:" ? "__Secure-authjs.session-token" : "authjs.session-token";
}

export function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

export function safeRedirectPath(value, fallback = "/account") {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\")
    ? value
    : fallback;
}
