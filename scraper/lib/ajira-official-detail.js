const cheerio = require("cheerio");
const { parseDeadline } = require("./jobs");

// The only valid verification target is a vacancy-level PSRS URL. The index
// page is not evidence of the full role or requirements.
function isOfficialDetailUrl(url) {
  try {
    const value = new URL(url);
    return value.protocol === "https:" &&
      value.hostname === "portal.ajira.go.tz" &&
      /^\/view-advert\/[^/]+\/?$/.test(value.pathname) &&
      !value.username && !value.password;
  } catch {
    return false;
  }
}
function comparable(text) {
  return String(text || "").toLowerCase().normalize("NFKC")
    .replace(/[^\p{L}\p{N}]+/gu, " ").trim().replace(/\s+/g, " ");
}
function between(text, start, end) {
  const startMatch = start.exec(text);
  if (!startMatch) return "";
  const remaining = text.slice(startMatch.index + startMatch[0].length);
  const endMatch = end.exec(remaining);
  return (endMatch ? remaining.slice(0, endMatch.index) : remaining).trim();
}
function parseOfficialAjiraDetail(html, expected = {}) {
  const $ = cheerio.load(html || "");
  $("script, style, nav, footer, noscript").remove();
  $("br").replaceWith("\n");
  $("h1, h2, h3, h4, h5, h6, p, li, tr").each((_, element) => {
    $(element).prepend("\n").append("\n");
  });
  const text = $("body").text().replace(/\r/g, "\n")
    .replace(/[ \t\u00a0]+/g, " ").replace(/\n[ \t]+/g, "\n");
  const headings = $("h1, h2, h3").map((_, node) => $(node).text().trim()).get();
  const title = headings.find((value) =>
    comparable(value) === comparable(expected.title)
  );
  if (!title || !expected.company || comparable(expected.company).length < 4) return null;
  if (!comparable(text).includes(comparable(expected.company))) return null;
  const period = text.match(/Application\s+Period\s*:?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{4})\s*[-–]\s*(\d{1,2}[/-]\d{1,2}[/-]\d{4})/i);
  if (!period) return null;
  const deadline = parseDeadline(period[2]);
  const expectedDeadline = parseDeadline(expected.deadline);
  if (!deadline || !expectedDeadline ||
      deadline.toISOString().slice(0, 10) !== expectedDeadline.toISOString().slice(0, 10)) {
    return null;
  }
  const duties = between(text, /Duties\s+and\s+Responsibilities/i, /\bQualifications\b/i)
    .replace(/^\s*(?:Duties|Responsibilities)\s*/i, "").trim();
  const qualifications = between(text, /\bQualifications\b/i, /\bRemuneration\b|(?:Apply\s+Now)/i)
    .replace(/^\s*Qualifications\s*/i, "").trim();
  if (duties.length < 45 || qualifications.length < 25 ||
      /^N\/A$/i.test(duties) || /^N\/A$/i.test(qualifications)) return null;

  return {
    title,
    company: expected.company,
    deadline,
    description: ["Job Purpose", duties, "Qualifications Required", qualifications].join("\n"),
    sourceUrl: expected.sourceUrl,
    applicationUrl: expected.sourceUrl,
    originalEvidence: {
      verified: true,
      deadlineVerified: true,
      originalUrl: expected.sourceUrl,
    },
  };
}

async function enrichOfficialAjiraJobs(jobs, {
  fetchFn = fetch,
  concurrency = 3,
} = {}) {
  const results = Array.from(jobs);
  let cursor = 0;
  let verified = 0;
  const worker = async () => {
    while (cursor < results.length) {
      const index = cursor++;
      const job = results[index];
      if (!isOfficialDetailUrl(job.sourceUrl)) continue;
      try {
        const response = await fetchFn(job.sourceUrl, {
          headers: { Accept: "text/html,application/xhtml+xml", "User-Agent": "DarajaJobsBot/1.0" },
          redirect: "follow",
          signal: AbortSignal.timeout(20000),
        });
        if (!response.ok) continue;
        const finalUrl = response.url || job.sourceUrl;
        if (!isOfficialDetailUrl(finalUrl)) continue;
        const official = parseOfficialAjiraDetail(await response.text(), job);
        if (!official) continue;
        results[index] = { ...job, ...official };
        verified += 1;
      } catch {
        // Failed or contradictory evidence must remain a review-only lead.
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, jobs.length || 1) }, worker));
  return { jobs: results, verified, unverified: results.length - verified };
}

module.exports = { isOfficialDetailUrl, parseOfficialAjiraDetail, enrichOfficialAjiraJobs };
