function normalizeOrigin(value) {
  const raw = String(value || "").trim();
  if (!raw) return "https://ajira.daraja.co.tz";

  try {
    const url = new URL(raw);
    if (!["http:", "https:"].includes(url.protocol)) {
      throw new Error("Unsupported site origin protocol");
    }
    url.pathname = "/";
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return "https://ajira.daraja.co.tz";
  }
}

function normalizeOptionalUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;

  try {
    const url = new URL(raw);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

export const SITE_ORIGIN = normalizeOrigin(
  process.env.NEXT_PUBLIC_SITE_ORIGIN || process.env.SITE_ORIGIN
);

export const WHATSAPP_CHANNEL_URL = normalizeOptionalUrl(
  process.env.NEXT_PUBLIC_WHATSAPP_CHANNEL_URL
) || "https://whatsapp.com/channel/0029Vanw1OQ1CYoYdxl32g3V";

export const SITE_HOSTNAME = new URL(SITE_ORIGIN).hostname.replace(/^www\./, "");

export const COOKIE_DOMAIN =
  String(process.env.NEXT_PUBLIC_COOKIE_DOMAIN || "").trim() ||
  `.${SITE_HOSTNAME}`;

export function absoluteSiteUrl(pathname = "/") {
  return new URL(pathname, `${SITE_ORIGIN}/`).toString();
}
