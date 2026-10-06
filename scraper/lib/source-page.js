const cheerio = require("cheerio");

const BLOCKED_MEDIA_PATTERNS =
  /(?:pixel|tracker|tracking|spacer|favicon|avatar|badge|sprite|emoji)/i;
const SOURCE_PAGE_TIMEOUT_MS = 20_000;

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
  } else if (
    /\b(?:log\s*in|login|sign\s*in|signin)\b/i.test(text) &&
    looksLikeApplicationUrl(url)
  ) {
    score = 45;
  } else if (
    /\b(?:register|create\s+account)\b/i.test(text) &&
    looksLikeApplicationUrl(url)
  ) {
    score = 30;
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

function firstSrcsetUrl(value) {
  const srcset = cleanText(value);
  if (!srcset) return "";
  return cleanText(srcset.split(",")[0]).split(/\s+/)[0] || "";
}

function imageCandidateForNode(node) {
  return (
    node.attr("src") ||
    node.attr("data-src") ||
    node.attr("data-lazy-src") ||
    node.attr("data-original") ||
    firstSrcsetUrl(node.attr("srcset")) ||
    ""
  );
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

  const semanticLogoImages = $(
    "img[src], img[data-src], img[data-lazy-src], img[data-original], img[srcset]"
  )
    .toArray()
    .filter((element) => {
      const node = $(element);
      const parent = node.parent();
      const nearestLink = node.closest("a");
      const semantics = [
        node.attr("alt"),
        node.attr("aria-label"),
        node.attr("class"),
        node.attr("id"),
        node.attr("title"),
        parent.attr("class"),
        parent.attr("id"),
        nearestLink.attr("class"),
        nearestLink.attr("id"),
      ]
        .filter(Boolean)
        .join(" ");
      return /(?:^|[\s_-])(?:logo|brand)(?:$|[\s_-])/i.test(semantics);
    })
    .map((element) => imageCandidateForNode($(element)));

  const companyLogo = firstUsable(
    [
      ...organisationLogos,
      $('meta[property="og:logo"]').attr("content"),
      $('meta[name="logo"]').attr("content"),
      $('meta[itemprop="logo"]').attr("content"),
      $('link[itemprop="logo"]').attr("href"),
      ...semanticLogoImages,
    ],
    pageUrl
  );

  const representativeImage = firstUsable(
    [
      ...structuredImages,
      $('meta[property="og:image"]').attr("content"),
      $('meta[name="twitter:image"]').attr("content"),
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

async function fetchSourcePageMetadata(
  pageUrl,
  {
    fetchFn = fetch,
    signal = AbortSignal.timeout(SOURCE_PAGE_TIMEOUT_MS),
  } = {}
) {
  if (!isSafePublicHttpUrl(pageUrl)) {
    return {
      applicationUrl: null,
      companyLogo: null,
      representativeImage: null,
    };
  }

  try {
    const response = await fetchFn(pageUrl, {
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "DarajaJobsBot/1.0 (+https://www.ajira.daraja.co.tz)",
      },
      signal,
    });
    if (!response?.ok) {
      return {
        applicationUrl: null,
        companyLogo: null,
        representativeImage: null,
      };
    }

    const contentType = response.headers?.get?.("content-type") || "";
    if (
      contentType &&
      !contentType.includes("text/html") &&
      !contentType.includes("application/xhtml+xml")
    ) {
      return {
        applicationUrl: null,
        companyLogo: null,
        representativeImage: null,
      };
    }

    return extractSourcePageMetadata(await response.text(), pageUrl);
  } catch {
    return {
      applicationUrl: null,
      companyLogo: null,
      representativeImage: null,
    };
  }
}

const BLOCK_TAGS =
  /<\/?(?:p|div|li|ul|ol|h[1-6]|tr|td|th|dt|dd|dl|section|article|header|footer|br|label|span)\b[^>]*>/gi;

// Readable lines from an HTML page, keeping block boundaries so labelled
// fields ("Employment Type" / "Contract") stay on separate lines.
function htmlToLines(html) {
  const $ = cheerio.load(html || "");
  $("script, style, noscript, template, svg").remove();
  const markup = ($("body").html() || "").replace(BLOCK_TAGS, "\n");
  return textToLines(cheerio.load(`<div>${markup}</div>`)("div").first().text());
}

function textToLines(text) {
  return String(text || "")
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

const FACT_LABELS = {
  location: ["Location", "Job Location", "Work Location", "Duty Station"],
  employmentType: ["Employment Type", "Job Type", "Contract Type", "Type of Employment"],
  experience: ["Experience level", "Experience Level", "Years of Experience", "Work Experience", "Experience"],
  deadline: ["Closing Date", "Application Deadline", "Deadline", "Apply Before", "Last Day to Apply"],
};

function escapeLabel(label) {
  return label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function labelledFacts(lines) {
  const facts = {};
  for (const [field, labels] of Object.entries(FACT_LABELS)) {
    for (const label of labels) {
      const exact = new RegExp(`^${escapeLabel(label)}\\s*:?$`, "i");
      const inline = new RegExp(`^${escapeLabel(label)}\\s*:\\s*(.+)$`, "i");
      for (let index = 0; index < lines.length && !facts[field]; index += 1) {
        const value = exact.test(lines[index])
          ? lines[index + 1]
          : lines[index].match(inline)?.[1];
        if (value && !/^[-–—]+$/.test(value) && value.length <= 120) {
          facts[field] = value;
        }
      }
      if (facts[field]) break;
    }
  }
  return facts;
}

function significantWords(title) {
  return String(title || "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 4);
}

function renderedPage(result) {
  if (typeof result === "string") return { text: result, html: "" };
  return { text: result?.text || "", html: result?.html || "" };
}

async function fetchPage(url, fetchFn, signal) {
  try {
    const response = await fetchFn(url, {
      redirect: "follow",
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "DarajaJobsBot/1.0 (+https://www.ajira.daraja.co.tz)",
      },
      signal,
    });
    if (!response?.ok) return { ok: false, html: "", url };
    const finalUrl = isSafePublicHttpUrl(response.url) ? response.url : url;
    return { ok: true, html: await response.text(), url: finalUrl };
  } catch {
    return { ok: false, html: "", url };
  }
}

// Confirms an apply/login/register destination actually opens to something.
// Sign-in and registration pages count: candidates go where the employer
// takes applications, even when it asks them to log in first.
const APPLICANT_INPUT = /<input\b[^>]*type=["']?(?:email|password|file|tel)\b|<form\b/i;

function pageHasContent(text, html) {
  const words = String(text || "").replace(/\s+/g, " ").trim();
  return words.length >= 20 || APPLICANT_INPUT.test(html || "");
}

async function destinationOpens(url, { fetchFn, render, signal }) {
  const page = await fetchPage(url, fetchFn, signal);
  if (page.ok && pageHasContent(htmlToLines(page.html).join(" "), page.html)) return true;
  if (!render) return false;
  try {
    const rendered = renderedPage(await render(url));
    return pageHasContent(rendered.text, rendered.html);
  } catch {
    return false;
  }
}

// Opens the employer's own vacancy page and reports whether it actually shows
// this vacancy, the facts it states, and the deepest working application
// destination (the employer's apply, login or registration page). When the
// vacancy page itself is where the application starts (an applicant form),
// that page is the destination. JavaScript-only pages are rendered with the
// optional renderer when static HTML is empty.
async function inspectEmployerPage(
  pageUrl,
  {
    title,
    fetchFn = fetch,
    render = null,
    signal = AbortSignal.timeout(SOURCE_PAGE_TIMEOUT_MS),
  } = {}
) {
  if (!isSafePublicHttpUrl(pageUrl)) {
    return { status: "unreachable", lines: [], facts: {}, applyUrl: null };
  }

  const words = significantWords(title);
  const showsVacancy = (lines) => {
    const text = lines.join(" ").toLowerCase();
    return text.length >= 80 && (!words.length || words.some((word) => text.includes(word)));
  };

  const fetched = await fetchPage(pageUrl, fetchFn, signal);
  let lines = fetched.ok ? htmlToLines(fetched.html) : [];
  let html = fetched.html;
  const baseUrl = fetched.url || pageUrl;

  if (!showsVacancy(lines) && render) {
    try {
      const rendered = renderedPage(await render(pageUrl));
      lines = textToLines(rendered.text);
      html = rendered.html;
    } catch {
      lines = [];
      html = "";
    }
  }

  if (!showsVacancy(lines)) {
    return { status: "blank", lines, facts: {}, applyUrl: null };
  }

  let applyUrl = html ? extractApplicationDestination(html, baseUrl) : null;
  if (
    applyUrl &&
    !applyUrl.startsWith("mailto:") &&
    applyUrl !== baseUrl &&
    !(await destinationOpens(applyUrl, { fetchFn, render, signal }))
  ) {
    applyUrl = null;
  }

  return {
    status: "ok",
    lines,
    facts: labelledFacts(lines),
    applyUrl: applyUrl || null,
  };
}

// Follows "Apply" links from a vacancy page to the page where the
// application actually starts (an apply form, sign-in or registration page),
// for a small bounded chain of hops. Returns the original URL when nothing
// deeper opens. Four hops covers recruiter/employer/detail/login/apply flows
// without turning application resolution into unbounded crawling.
async function deepenApplicationUrl(
  url,
  { fetchFn = fetch, render = null, maxHops = 4 } = {}
) {
  let current = url;

  for (let hop = 0; hop < maxHops; hop += 1) {
    if (!current || current.startsWith("mailto:") || !isSafePublicHttpUrl(current)) break;

    const signal = AbortSignal.timeout(SOURCE_PAGE_TIMEOUT_MS);
    const fetched = await fetchPage(current, fetchFn, signal);
    let html = fetched.ok ? fetched.html : "";
    const baseUrl = fetched.url || current;
    let next = html ? extractApplicationDestination(html, baseUrl) : null;

    if (!next && render) {
      try {
        const rendered = renderedPage(await render(current));
        html = rendered.html;
        next = html ? extractApplicationDestination(html, baseUrl) : null;
      } catch {
        next = null;
      }
    }

    if (next && next !== baseUrl && next !== current) {
      if (
        next.startsWith("mailto:") ||
        (await destinationOpens(next, { fetchFn, render, signal }))
      ) {
        current = next;
        continue;
      }
    }

    // A URL that merely looks like /auth or /login is not trusted by its path
    // alone. It is accepted only after the live page opens and exposes no
    // deeper application/login target.
    if (
      looksLikeApplicationUrl(current) &&
      (await destinationOpens(current, { fetchFn, render, signal }))
    ) {
      break;
    }

    break;
  }

  return current;
}

// One shared headless browser per scraper run, with a page budget so a large
// source cannot make the run slow. Returns null renders once the budget is
// spent or when Playwright is unavailable.
function createPageRenderer({
  launch = async () => require("playwright").chromium.launch({ headless: true }),
  budget = Number.parseInt(process.env.EMPLOYER_PAGE_RENDER_BUDGET || "20", 10),
  timeoutMs = 25_000,
} = {}) {
  let browser = null;
  let remaining = budget;
  return {
    async render(url) {
      if (remaining <= 0) return null;
      remaining -= 1;
      browser ||= await launch();
      const page = await browser.newPage();
      try {
        await page.goto(url, { waitUntil: "networkidle", timeout: timeoutMs });
        return {
          text: await page.evaluate(() => document.body?.innerText || ""),
          html: await page.content(),
        };
      } finally {
        await page.close();
      }
    },
    async close() {
      await browser?.close();
      browser = null;
    },
  };
}

module.exports = {
  createPageRenderer,
  deepenApplicationUrl,
  extractApplicationDestination,
  extractSourceMedia,
  extractSourcePageMetadata,
  fetchSourcePageMetadata,
  htmlToLines,
  inspectEmployerPage,
  isSafePublicHttpUrl,
  labelledFacts,
  looksLikeApplicationUrl,
  normalizeCandidateUrl,
};
