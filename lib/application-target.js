import * as cheerio from "cheerio";
import { isIP } from "node:net";

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

const DIRECT_ATS_HOSTS = [
  "greenhouse.io",
  "jobs.smartrecruiters.com",
  "lever.co",
  "myworkdayjobs.com",
  "oraclecloud.com",
  "successfactors.com",
  "taleo.net",
  "workdayjobs.com",
];

const RESOLVER_SOURCE_HOSTS = new Map([
  ["ajira", ["portal.ajira.go.tz"]],
  ["nmb-bank-careers", ["careers.nmbbank.co.tz"]],
]);

export const MAX_APPLICATION_HTML_BYTES = 1_000_000;

function isHostOrSubdomain(hostname, expected) {
  return hostname === expected || hostname.endsWith(`.${expected}`);
}

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
    const hostname = url.hostname
      .toLowerCase()
      .replace(/^\[/, "")
      .replace(/\]$/, "")
      .replace(/^www\./, "");
    if (!["http:", "https:"].includes(url.protocol)) return false;
    if (url.username || url.password || isIP(hostname)) return false;
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
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  const target = `${url.pathname}${url.search}`.toLowerCase();
  if (DIRECT_ATS_HOSTS.some((expected) => isHostOrSubdomain(host, expected))) {
    return true;
  }
  return /(?:^|[\/_-])(?:apply|application|candidate|login|log-in|signin|sign-in|auth)(?:[\/_?=&-]|$)/i.test(
    target
  );
}

export function isAllowedResolverUrl(source, value) {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    const allowedHosts = RESOLVER_SOURCE_HOSTS.get(source);
    return Boolean(
      allowedHosts &&
        url.protocol === "https:" &&
        !url.username &&
        !url.password &&
        (!url.port || url.port === "443") &&
        allowedHosts.some((expected) => isHostOrSubdomain(hostname, expected))
    );
  } catch {
    return false;
  }
}

export async function fetchAllowedApplicationPage({
  source,
  url,
  fetchFn = fetch,
  signal,
  maxRedirects = 3,
}) {
  let currentUrl = url;

  for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount += 1) {
    if (!isAllowedResolverUrl(source, currentUrl)) {
      throw new Error("Application resolver destination is not allowlisted");
    }

    const response = await fetchFn(currentUrl, {
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "DarajaJobsBot/1.0 (+https://www.ajira.daraja.co.tz)",
      },
      redirect: "manual",
      cache: "no-store",
      signal,
    });

    if (response.status < 300 || response.status >= 400) {
      return { response, url: currentUrl };
    }

    if (redirectCount === maxRedirects) {
      throw new Error("Application resolver exceeded its redirect limit");
    }
    const location = response.headers.get("location");
    if (!location) {
      throw new Error("Application resolver received an invalid redirect");
    }
    currentUrl = new URL(location, currentUrl).toString();
  }

  throw new Error("Application resolver could not complete the request");
}

export async function readBoundedApplicationHtml(
  response,
  maxBytes = MAX_APPLICATION_HTML_BYTES
) {
  const declaredLength = Number(response.headers.get("content-length") || 0);
  if (declaredLength > maxBytes) {
    throw new Error("Application page exceeds the response-size limit");
  }

  if (!response.body?.getReader) {
    const text = await response.text();
    if (new TextEncoder().encode(text).byteLength > maxBytes) {
      throw new Error("Application page exceeds the response-size limit");
    }
    return text;
  }

  const reader = response.body.getReader();
  const chunks = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > maxBytes) {
      await reader.cancel();
      throw new Error("Application page exceeds the response-size limit");
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
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
