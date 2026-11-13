"use strict";

// Low-frequency, read-only retrieval of the *rounded public label*.
// This is not an official WhatsApp API and must be disabled if access is restricted.
const CHANNEL_URL = "https://www.whatsapp.com/channel/0029Vanw1OQ1CYoYdxl32g3V";
const SNAPSHOT_KEY = "channel.publicAudience";
const MIN_INTERVAL_MS = 24 * 60 * 60 * 1000;
const MAX_AGE_MS = 7 * MIN_INTERVAL_MS;

function parsePublicAudience(html) {
  const text = String(html || "")
    .replace(/&bull;|&#8226;|&#x2022;/gi, "•")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ");
  if (!/DARAJA\s*\|\s*KAZI NA FURSA TANZANIA/i.test(text)) return null;
  const match = text.match(/Channel\s*[•·\-]\s*([\d,.]+)\s*([KMB]?)\s+followers\b/i);
  if (!match) return null;
  const multiplier = { "": 1, K: 1_000, M: 1_000_000, B: 1_000_000_000 }[match[2].toUpperCase()];
  const amount = Number(match[1].replace(/,/g, ""));
  if (!Number.isFinite(amount) || amount <= 0 || !multiplier) return null;
  const lowerBound = Math.floor(amount * multiplier);
  if (!Number.isSafeInteger(lowerBound) || lowerBound > 1_000_000_000) return null;
  return { label: `${match[1]}${match[2].toUpperCase()}`, lowerBound };
}

function verifiedPublicAudience(snapshot, now = Date.now()) {
  if (!snapshot || typeof snapshot !== "object") return null;
  if (snapshot.source !== CHANNEL_URL || typeof snapshot.label !== "string") return null;
  const verifiedAt = Date.parse(snapshot.verifiedAt);
  if (!Number.isFinite(verifiedAt) || verifiedAt > now || now - verifiedAt > MAX_AGE_MS) return null;
  if (!/^\d+(?:[.,]\d+)?[KMB]?$/.test(snapshot.label)) return null;
  return snapshot;
}

async function syncPublicAudience(prisma, { now = new Date(), fetcher = fetch } = {}) {
  if (process.env.WHATSAPP_CHANNEL_SYNC_ENABLED !== "true") return { status: "disabled" };
  const saved = await prisma.siteSetting.findUnique({ where: { key: SNAPSHOT_KEY } });
  const previous = saved?.value && typeof saved.value === "object" ? saved.value : {};
  const lastAttempt = Date.parse(previous.lastAttemptAt);
  if (Number.isFinite(lastAttempt) && now.getTime() - lastAttempt < MIN_INTERVAL_MS) {
    return { status: "skipped" };
  }
  let audience;
  let status = "unavailable";
  try {
    const response = await fetcher(CHANNEL_URL, {
      headers: { Accept: "text/html" },
      signal: AbortSignal.timeout(8000),
      redirect: "follow",
    });
    const target = new URL(response.url || CHANNEL_URL);
    if (target.hostname !== "www.whatsapp.com" || !response.ok) throw new Error("Unexpected channel response");
    const size = Number(response.headers?.get?.("content-length") || 0);
    if (size > 256_000) throw new Error("Channel response too large");
    const html = (await response.text()).slice(0, 256_000);
    audience = parsePublicAudience(html);
    if (!audience) throw new Error("Channel identity or follower label missing");
    status = "updated";
  } catch {
    // Retain last verified result. No synthetic follower counts on failure.
  }
  const next = {
    ...previous,
    ...(audience ? { ...audience, source: CHANNEL_URL, verifiedAt: now.toISOString() } : {}),
    lastAttemptAt: now.toISOString(),
  };
  await prisma.siteSetting.upsert({
    where: { key: SNAPSHOT_KEY },
    create: { key: SNAPSHOT_KEY, value: next },
    update: { value: next },
  });
  return { status, label: audience?.label || null };
}

module.exports = {
  CHANNEL_URL,
  SNAPSHOT_KEY,
  parsePublicAudience,
  verifiedPublicAudience,
  syncPublicAudience,
};
