import * as cheerio from "cheerio";

const BLOCKED_HOSTS = [
  "facebook.com",
  "instagram.com",
  "linkedin.com",
  "twitter.com",
  "x.com",
  "youtube.com",
  "whatsapp.com",
  "doubleclick.net",
  "googlesyndication.com",
];

function isPrivateIpv4(hostname) {
  return (
    /^127\./.test(hostname) ||
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^169\.254\./.test(hostname) ||
    /^172\.(?:1[6-9]|2\d|3[01])\./.test(hostname)
  );
}

export function isSafePublicHttpUrl(value) {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    if (!["http:", "https:"].includes(url.protocol)) return false;
    if (
      !hostname ||
      hostname === "localhost" ||
      hostname.endsWith(".localhost") ||
      hostname.endsWith(".local") ||
      hostname.endsWith(".internal") ||
      hostname === "::1" ||
      /^f[cd][0-9a-f:]*$/i.test(hostname) ||
      /^fe8[0-9a-f:]*$/i.test(hostname) ||
      isPrivateIpv4(hostname)
    ) {
      return false;
    }
    return !BLOCKED_HOSTS.some(
      (blocked) => hostname === blocked || hostname.endsWith(`.${blocked}`)
    );
  } catch {
    return false;
  }
}

export function isLikelyDirectApplicationUrl(value) {
  if (!isSafePublicHttpUrl(value)) return false;
  const url = new URL(value);
  const host = url.hostname.toLowerCase();
  const target = `${url.pathname}${url.search}`.toLowerCase();
  if (
    /(?:smartrecruiters|workdayjobs|myworkdayjobs|greenhouse|lever|successfactors|oraclecloud|taleo)/i.test(host)
  ) {
    return true;
  }
  return /(?:^|[\/_-])(?:apply|application|candidate|login|log-in|signin|sign-in|auth)(?:[\/_?=&-]|$)/i.test(
    target
  );
}

function cleanLabel(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function candidateScore(label, url) {
  const text = cleanLabel(label).toLowerCase();
  let score = 0;
  if (
    /(?:login|log in|sign in)\s+to\s+apply|apply\s+(?:now|here|for)|submit\s+(?:an?\s+)?application|start\s+(?:an?\s+)?application|continue\s+(?:an?\s+)?application|proceed\s+to\s+apply/.test(
      text
    )
  ) {
    score = 100;
  } else if (/\bapply\b|\bapplication\b/.test(text)) {
    score = 80;
  } else if (/\blog\s*in\b|\bsign\s*in\b/.test(text)) {
    score = 40;
  }
  if (isLikelyDirectApplicationUrl(url)) score += 30;
  return score;
}

function getElementTarget($, element, pageUrl) {
  const node = $(element);
  const raw = node.attr("href") || node.attr("formaction") || node.attr("action") || "";
  if (!raw || raw.startsWith("#") || /^javascript:/i.test(raw)) return null;
  try {
    const url = new URL(raw, pageUrl).toString();
    if (!isSafePublicHttpUrl(url)) return null;
    return url;
  } catch {
    return null;
  }
}

export function extractFinalApplicationUrl(html, pageUrl) {
  if (!isSafePublicHttpUrl(pageUrl)) return null;
  const $ = cheerio.load(html || "");
  let best = null;

  $("a[href], button[formaction], form[action]").each((index, element) => {
    const url = getElementTarget($, element, pageUrl);
    if (!url) return;
    const node = $(element);
    const label = [
      node.text(),
      node.attr("aria-label"),
      node.attr("title"),
      node.attr("value"),
    ]
      .filter(Boolean)
      .join(" ");
    const score = candidateScore(label, url);
    if (!score) return;

    if (!best || score > best.score || (score === best.score && index > best.index)) {
      best = { url, score, index };
    }
  });

  return best?.url || null;
}
