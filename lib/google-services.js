export const CONSENT_STORAGE_KEY = "daraja-privacy-consent-v1";
export const CONSENT_EVENT = "daraja:privacy-consent";

export function isValidGoogleAnalyticsId(value) {
  return /^G-[A-Z0-9]{4,20}$/.test(value || "");
}

export function isValidAdSenseClient(value) {
  return /^ca-pub-\d{16}$/.test(value || "");
}

export function isValidAdSenseSlot(value) {
  return /^\d{6,20}$/.test(value || "");
}
