const cheerio = require("cheerio");
const { SCRAPER_USER_AGENT } = require("../lib/runtime-config");
const { cleanText, deduplicateJobs, mapEmploymentType, parseDeadline } = require("../lib/jobs");
const { feeSignal } = require("../lib/job-policy");
const { extractDeadline } = require("./ajiraweb");

// Adapted from source-learning (PR #186). A discovery board supplies leads,
// never original-source evidence or automatic publication authority.
const NON_VACANCY = /\b(?:called\s+for|names\s+called|kuitwa|results?|matokeo|selection|admission|scholarships?|tenders?|interview\s+schedule)\b/i;
const SOCIAL_HOSTS = /(?:^|\.)(?:facebook\.com|twitter\.com|x\.com|instagram\.com|linkedin\.com|youtube\.com|whatsapp\.com|t\.me|google\.com|wa\.me)$/i;
const ATS_HOSTS = /(?:^|\.)(?:smartrecruiters\.com|greenhouse\.io|lever\.co|myworkdayjobs\.com|oraclecloud\.com)$/i;
const PRIVATE_HOST = /^(?:localhost|0\.0\.0\.0|127\.|10\.|192\.168\.|169\.254\.|172\.(?:1[6-9]|2\d|3[01])\.|\[|.*\.local$|.*\.internal$)/i;

function roleTitle(value) {
  return cleanText(value).split(/\s+(?:job\s+vacanc(?:y|ies)|vacanc(?:y|ies)|jobs?)\s+at\s+/i)[0]
    .split(/\s+at\s+/i)[0].replace(/^urgent\s+/i, "").trim();
}
function itemText(node, tag) {
  return cleanText(node.find(tag.replace(":", "\\:")).first().text());
}
function publicUrl(value, base) {
  try {
    const url = new URL(value, base);
    return url.protocol === "https:" && !url.username && !url.password && !PRIVATE_HOST.test(url.hostname)
      ? url : null;
  } catch { return null; }
}
function officialLinkFrom(html, articleUrl) {
  const $ = cheerio.load(html || "");
  const boardHost = new URL(articleUrl).hostname.replace(/^www\./, "");
  const candidates = [];
  $("a[href]").each((_, element) => {
    const url = publicUrl($(element).attr("href"), articleUrl);
    if (!url) return;
    const host = url.hostname.replace(/^www\./, "");
    if (host === boardHost || host.endsWith(`.${boardHost}`) || SOCIAL_HOSTS.test(host)) return;
    const score = (ATS_HOSTS.test(host) ? 4 : 0) + (/apply|tuma|maombi/i.test($(element).text()) ? 2 : 0)
      + (url.pathname.replace(/\/+$/, "").length > 1 ? 1 : 0);
    if (score) candidates.push({ url: url.toString(), score });
  });
  return candidates.sort((a, b) => b.score - a.score)[0]?.url || null;
}
function mailtoFrom(html) {
  const $ = cheerio.load(html || "");
  const email = ($('a[href^="mailto:"]').first().attr("href") || "")
    .replace(/^mailto:/i, "").split("?")[0].trim();
  return /^[^\s@?&#%]+@[^\s@?&#%]+\.[^\s@?&#%]+$/.test(email) ? `mailto:${email}` : null;
}
function parseDiscoveryFeed(xml, source, { now = new Date() } = {}) {
  const $ = cheerio.load(xml, { xmlMode: true });
  if (!$("rss > channel").length) throw new Error("Discovery response is not an RSS job feed");
  const jobs = [];
  const sourceHost = new URL(source.url).hostname.replace(/^www\./, "");
  let skipped = 0;
  const limit = Math.min(Math.max(Number(source.feed?.maxItems) || 30, 1), 50);
  $("item").slice(0, limit).each((_, item) => {
    const node = $(item);
    const feedTitle = itemText(node, "title");
    const article = publicUrl(itemText(node, "link"));
    if (!article || article.hostname.replace(/^www\./, "") !== sourceHost ||
        !article.pathname.startsWith("/job/") || NON_VACANCY.test(feedTitle)) { skipped += 1; return; }
    const content = node.find("content\\:encoded").first().text() || node.find("description").first().text();
    const text = cleanText(cheerio.load(content || "").text());
    const deadlineText = extractDeadline(text);
    const deadline = parseDeadline(deadlineText);
    const title = roleTitle(feedTitle);
    const company = itemText(node, "job_listing:company");
    const location = itemText(node, "job_listing:location");
    // Unknown country is reviewable; explicit non-Tanzania locations are excluded.
    if (!title || !company || (deadline && deadline < now) || /\b(?:kenya|nairobi|uganda|kampala|nigeria|lagos|rwanda|kigali)\b/i.test(location)) { skipped += 1; return; }
    const applicationUrl = mailtoFrom(content) || officialLinkFrom(content, article.toString());
    const fee = feeSignal(text);
    const description = [
      `Discovery lead: ${title} at ${company}${location ? ` in ${location}` : ""}.`,
      "An administrator must verify the original employer notice, application destination, closing date and final description before publication.",
      ...(fee ? [`Candidate-payment risk found in source: ${fee}`] : []),
    ].join("\n");
    jobs.push({ title, company, location: location || "Tanzania", deadline: deadlineText, description,
      type: mapEmploymentType(itemText(node, "job_listing:job_type")),
      sourceUrl: article.toString(), applicationUrl,
      reviewReasons: ["secondary discovery lead; original employer notice and editorial content require administrator verification"],
    });
  });
  const result = deduplicateJobs(jobs, { source: source.id, baseUrl: source.url, now });
  Object.defineProperty(result, "health", { value: {
    discovered: Math.min($("item").length, limit), held: result.length, skipped,
    preserveExisting: true, archiveEmptySnapshot: false,
  }});
  return result;
}
async function collectDiscoveryFeedJobs(source, { fetchFn = fetch, now = new Date() } = {}) {
  const feedUrl = publicUrl(source.feed?.url);
  const sourceHost = new URL(source.url).hostname.replace(/^www\./, "");
  if (!feedUrl || feedUrl.hostname.replace(/^www\./, "") !== sourceHost) throw new Error("Discovery feed must use its configured public HTTPS source host");
  const response = await fetchFn(feedUrl.toString(), {
    redirect: "error", signal: AbortSignal.timeout(30000),
    headers: { Accept: "application/rss+xml, application/xml;q=0.9", "User-Agent": SCRAPER_USER_AGENT },
  });
  if (!response.ok) throw new Error(`${source.name} feed returned HTTP ${response.status}`);
  const xml = await response.text();
  if (xml.length > 2000000) throw new Error("Discovery feed exceeds the size limit");
  return parseDiscoveryFeed(xml, source, { now });
}
module.exports = { collectDiscoveryFeedJobs, parseDiscoveryFeed, officialLinkFrom, roleTitle };
