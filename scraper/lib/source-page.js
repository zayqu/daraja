const cheerio = require("cheerio");

const BLOCKED_MEDIA_PATTERNS =
  /(?:pixel|tracker|tracking|spacer|favicon|avatar|badge|sprite|emoji)/i;

const DIRECT_APPLICATION_HOSTS = [
  "greenhouse.io",
  "jobs.smartrecruiters.com",
  "lever.co",
  "myworkdayjobs.com",
  "workdayjobs.com",
  "oraclecloud.com",
  "successfactors.com",
  "taleo.net",
];

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
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

function isSafePublicHttpUrl(value) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    return (
      ["http:", "https:"].includes(url.protocol) &&
      !url.username &&
      !url.password &&
      host &&
      host !== "localhost" &&
      !host.endsWith(".localhost") &&
      !host.endsWith(".local") &&
      !host.endsWith(".internal") &&
      !isPrivateIpv4(host)
    );
  } catch {
    return false;
  }
}

function normalizeCandidateUrl(value, pageUrl, { allowMailto = false } = {}) {
  const raw = cleanText(value);
  if (!raw || raw.startsWith("#") || /^javascript:/i.test(raw)) return null;

  try {
    const url = new URL(raw, pageUrl);
    if (url.protocol === "mailto:") {
      if (!allowMailto) return null;
      const email = decodeURIComponent(url.pathname).trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
      return url.toString();
    }
    if (!isSafePublicHttpUrl(url.toString())) return null;
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function isDirectApplicationHost(hostname) {
  const host = String(hostname || "").toLowerCase().replace(/^www\./, "");
  return DIRECT_APPLICATION_HOSTS.some(
    (expected) => host === expected || host.endsWith("." + expected)
  );
}

function looksLikeApplicationUrl(value) {
  if (!isSafePublicHttpUrl(value)) return false;
  const url = new URL(value);
  if (isDirectApplicationHost(url.hostname)) return true;
  const target = (url.pathname + url.search).toLowerCase();
  return /(?:^|[\/_-])(?:apply|application|candidate|login|log-in|signin|sign-in|register|registration|auth)(?:[\/_?=&-]|$)/i.test(
    target
  );
}

function applicationScore(label, url) {
  const text = cleanText(label).toLowerCase();
  let score = 0;

  if (
    /(?:apply\s+(?:now|here|online|for)|start\s+(?:an?\s+)?application|continue\s+(?:an?\s+)?application|submit\s+(?:an?\s+)?application|login\s+to\s+apply|sign\s+in\s+to\s+apply|register\s+to\s+apply)/i.test(
      text
    )
  ) {
    score = 120;
  } else if (/\bapply\b|\bapplication\b/i.test(text)) {
    score = 90;
  } else if (/email\s+(?:your\s+)?(?:application|cv)|send\s+(?:your\s+)?cv/i.test(text)) {
    score = 100;
  }

  if (score > 0 && url.startsWith("mailto:")) score += 35;
  else if (score > 0 && looksLikeApplicationUrl(url)) score += 30;

  return score;
}

function elementTarget($, element, pageUrl) {
  const node = $(element);
  const raw =
    node.attr("href") ||
    node.attr("formaction") ||
    node.attr("action") ||
    "";

  return normalizeCandidateUrl(raw, pageUrl, { allowMailto: true });
}

function extractApplicationDestination(html, pageUrl) {
  if (!isSafePublicHttpUrl(pageUrl)) return null;

  const $ = cheerio.load(html || "");
  let best = null;

  $("a[href], button[formaction], form[action]").each((index, element) => {
    const url = elementTarget($, element, pageUrl);
    if (!url) return;

    const node = $(element);
    const label = [
      node.text(),
      node.attr("aria-label"),
      node.attr("title"),
      node.attr("value"),
      node.attr("name"),
    ]
      .filter(Boolean)
      .join(" ");

    const score = applicationScore(label, url);
    if (!score) return;

    if (!best || score > best.score || (score === best.score && index > best.index)) {
      best = { url, score, index };
    }
  });

  if (best?.url) return best.url;

  const hasApplicationForm = $("form").toArray().some((form) => {
    const node = $(form);
    const formText = cleanText(node.text());
    const hasApplicantInput = Boolean(
      node.find(
        'input[type="email"], input[type="file"], input[name*="cv" i], input[name*="resume" i], input[name*="name" i]'
      ).length
    );
    return (
      hasApplicantInput &&
      /apply|application|candidate|register|submit/i.test(formText)
    );
  });

  if (hasApplicationForm || looksLikeApplicationUrl(pageUrl)) {
    return pageUrl;
  }

  return null;
}

function jsonLdValues(html) {
  const $ = cheerio.load(html || "");
  const values = [];

  for (const script of $('script[type="application/ld+json"]').toArray()) {
    try {
      const parsed = JSON.parse($(script).text());
      values.push(parsed);
    } catch {
      // Ignore malformed structured data.
    }
  }

  return values;
}

function flattenJsonLd(value, output = []) {
  if (Array.isArray(value)) {
    for (const item of value) flattenJsonLd(item, output);
    return output;
  }
  if (!value || typeof value !== "object") return output;

  output.push(value);
  if (Array.isArray(value["@graph"])) {
    for (const item of value["@graph"]) flattenJsonLd(item, output);
  }
  return output;
}

function imageValue(value) {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return "";
  return value.url || value.contentUrl || value["@id"] || "";
}

function usableImageUrl(value, pageUrl) {
  const url = normalizeCandidateUrl(imageValue(value), pageUrl);
  if (!url) return null;

  try {
    const parsed = new URL(url);
    if (BLOCKED_MEDIA_PATTERNS.test(parsed.pathname)) return null;
    return url;
  } catch {
    return null;
  }
}

function firstUsable(values, pageUrl) {
  for (const value of values) {
    const url = usableImageUrl(value, pageUrl);
    if (url) return url;
  }
  return null;
}

function extractSourceMedia(html, pageUrl) {
  if (!isSafePublicHttpUrl(pageUrl)) {
    return { companyLogo: null, representativeImage: null };
  }

  const $ = cheerio.load(html || "");
  const objects = jsonLdValues(html).flatMap((value) => flattenJsonLd(value));
  const jobPostings = objects.filter((item) => {
    const type = item?.["@type"];
    return Array.isArray(type)
      ? type.includes("JobPosting")
      : type === "JobPosting";
  });

  const organisationLogos = [];
  const structuredImages = [];

  for (const posting of jobPostings) {
    const organisation = posting.hiringOrganization || posting.organization;
    if (organisation?.logo) organisationLogos.push(organisation.logo);
    if (posting.image) {
      structuredImages.push(
        ...(Array.isArray(posting.image) ? posting.image : [posting.image])
      );
    }
  }

  for (const item of objects) {
    const type = item?.["@type"];
    const isOrganisation =
      type === "Organization" ||
      type === "Corporation" ||
      (Array.isArray(type) &&
        (type.includes("Organization") || type.includes("Corporation")));
    if (isOrganisation && item.logo) organisationLogos.push(item.logo);
  }

  const semanticLogoImages = $("img[src]")
    .toArray()
    .filter((element) => {
      const node = $(element);
      return /logo|brand|organisation|organization|company/i.test(
        [
          node.attr("alt"),
          node.attr("class"),
          node.attr("id"),
          node.attr("title"),
        ]
          .filter(Boolean)
          .join(" ")
      );
    })
    .map((element) => $(element).attr("src"));

  const companyLogo = firstUsable(
    [
      ...organisationLogos,
      $('meta[property="og:logo"]').attr("content"),
      ...semanticLogoImages,
    ],
    pageUrl
  );

  const representativeImage = firstUsable(
    [
      ...structuredImages,
      $('meta[property="og:image"]').attr("content"),
      $('meta[name="twitter:image"]').attr("content"),
      $("main img[src]").first().attr("src"),
      $("article img[src]").first().attr("src"),
    ],
    pageUrl
  );

  return {
    companyLogo,
    representativeImage:
      representativeImage && representativeImage !== companyLogo
        ? representativeImage
        : null,
  };
}

function extractSourcePageMetadata(html, pageUrl) {
  return {
    applicationUrl: extractApplicationDestination(html, pageUrl),
    ...extractSourceMedia(html, pageUrl),
  };
}

module.exports = {
  extractApplicationDestination,
  extractSourceMedia,
  extractSourcePageMetadata,
  isSafePublicHttpUrl,
  looksLikeApplicationUrl,
  normalizeCandidateUrl,
};
