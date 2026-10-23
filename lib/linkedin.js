import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { absoluteSiteUrl } from "@/lib/site-config";

export const LINKEDIN_CONNECT_CALLBACK = absoluteSiteUrl("/api/linkedin/callback");
export const LINKEDIN_CONNECT_SCOPES = "openid profile w_member_social";
export const LINKEDIN_STATE_COOKIE = "__Secure-daraja-linkedin-state";

function encryptionKey() {
  const value = String(process.env.LINKEDIN_TOKEN_ENCRYPTION_KEY || "").trim();
  if (!/^[0-9a-fA-F]{64}$/.test(value)) {
    throw new Error("LINKEDIN_TOKEN_ENCRYPTION_KEY must be a 32-byte hex value");
  }
  return Buffer.from(value, "hex");
}

export function encryptLinkedInToken(token) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(String(token), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function decryptLinkedInToken(payload) {
  const [version, ivValue, tagValue, ciphertextValue] = String(payload || "").split(".");
  if (version !== "v1" || !ivValue || !tagValue || !ciphertextValue) {
    throw new Error("Invalid LinkedIn token payload");
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(ivValue, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextValue, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export function buildLinkedInAuthorizationUrl({ clientId, state }) {
  const url = new URL("https://www.linkedin.com/oauth/v2/authorization");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", LINKEDIN_CONNECT_CALLBACK);
  url.searchParams.set("state", state);
  url.searchParams.set("scope", LINKEDIN_CONNECT_SCOPES);
  return url.toString();
}

export async function exchangeLinkedInCode({ code, clientId, clientSecret }) {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: LINKEDIN_CONNECT_CALLBACK,
  });
  const response = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`LinkedIn token exchange failed (${response.status})`);
  }
  return response.json();
}

export async function fetchLinkedInProfile(accessToken) {
  const response = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`LinkedIn profile request failed (${response.status})`);
  }
  return response.json();
}

export async function publishLinkedInTextShare({ accessToken, memberId, text }) {
  const response = await fetch("https://api.linkedin.com/v2/ugcPosts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify({
      author: `urn:li:person:${memberId}`,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text },
          shareMediaCategory: "NONE",
        },
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
      },
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 500);
    throw new Error(`LinkedIn publish failed (${response.status}): ${detail}`);
  }

  return {
    postId: response.headers.get("x-restli-id") || null,
  };
}
