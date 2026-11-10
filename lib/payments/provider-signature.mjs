import { createPublicKey, verify as cryptoVerify } from "node:crypto";

/**
 * Low-level RSA verifier for a signed callback.
 *
 * This deliberately does NOT choose AzamPay's canonical message format,
 * public-key endpoint, certificate rotation rules or callback JSON fields:
 * those MUST come from the approved merchant-specific AzamPay API contract.
 * An adapter may only pass canonicalMessage after constructing it under that
 * verified contract, and publicKeyPem must come from a pinned trusted source.
 *
 * No unsigned callback can be accepted here, and this function never
 * marks a payment as settled or changes the database.
 */
export function verifySignedProviderMessage({
  canonicalMessage, signatureBase64, publicKeyPem,
  algorithm = "RSA-SHA256",
} = {}) {
  if (algorithm !== "RSA-SHA256" ||
      typeof canonicalMessage !== "string" || canonicalMessage.length < 1 ||
      canonicalMessage.length > 16384 ||
      typeof signatureBase64 !== "string" ||
      signatureBase64.length < 32 || signatureBase64.length > 8192 ||
      !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(signatureBase64) ||
      typeof publicKeyPem !== "string" || publicKeyPem.length > 16384 ||
      !publicKeyPem.includes("-----BEGIN PUBLIC KEY-----")) {
    return false;
  }

  try {
    const publicKey = createPublicKey(publicKeyPem);
    if (publicKey.asymmetricKeyType !== "rsa" &&
        publicKey.asymmetricKeyType !== "rsa-pss") return false;
    const signature = Buffer.from(signatureBase64, "base64");
    if (signature.length === 0) return false;
    return cryptoVerify(
      "RSA-SHA256",
      Buffer.from(canonicalMessage, "utf8"),
      publicKey,
      signature,
    );
  } catch {
    // Untrusted key/signature errors must not leak raw callback data.
    return false;
  }
}
