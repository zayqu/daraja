const cheerio = require("cheerio");

const { SCRAPER_USER_AGENT } = require("../lib/runtime-config");
const { cleanText, deduplicateJobs, mapEmploymentType } = require("../lib/jobs");
const {
  collectedByEnabledSource,
  createLearningLog,
  detectAts,
  fetchAtsPosting,
} = require("../lib/source-learning");
const { extractDeadline, fetchOfficialJob } = require("./ajiraweb");

// Discovery feeds are secondary job boards (policy precedence 6). Their
// posts are leads: Daraja follows each lead to the employer's own applicant
// system and publishes only what that system confirms. Leads that cannot be
// confirmed automatically are kept for administrator review, and every lead
// feeds the source-learning report.

const REQUEST_TIMEOUT_MS = 60000;
const NON_VACANCY = /\b(?:called\s+for|names\s+called|kuitwa|results?|matokeo|selection|admission|scholarships?|tenders?|interview\s+schedule)\b/i;
const SOCIAL_HOSTS = /(facebook|twitter|instagram|linkedin|youtube|whatsapp|t\.me|google|doubleclick|wa\.me)/i;

function roleTitle(feedTitle) {
  const title = cleanText(feedTitle);
  const role = title
    .split(/\s+(?:job\s+vacanc(?:y|ies)|vacanc(?:y|ies)|jobs?)\s+at\s+/i)[0]
    .split(/\s+at\s+/i)[0];
  return cleanText(role.replace(/^urgent\s+/i, "")) || title;
}

function itemText(node, tag) {
  return cleanText(node.find(tag.replace(":", "\\:")).first().text());
}

// Picks the link most likely to be the employer's own vacancy or application
// page: applicant systems first, then deep links on another host, never the
// discovery board itself or social media.
function officialLinkFrom(html, articleUrl) {
  const $ = cheerio.load(html || "");
  const boardHost = new URL(articleUrl).hostname.replace(/^www\./, "");
  const candidates = [];
  $("a[href]").each((_, element) => {
    try {
      const url = new URL($(element).attr("href"), articleUrl);
      const host = url.hostname.replace(/^www\./, "");
      if (!["http:", "https:"].includes(url.protocol)) return;
      if (host === boardHost || host.endsWith(`.${boardHost}`) || SOCIAL_HOSTS.test(host)) return;
      const label = cleanText($(element).text());
      let score = 0;
      if (detectAts(url.toString())) score += 4;
      if (/apply|tuma|maombi/i.test(label)) score += 2;
      if (url.pathname.replace(/\/+$/, "").length > 1) score += 1;
      candidates.push({ url: url.toString(), score });
    } catch {
      // Ignore malformed links.
    }
  });
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0]?.score > 0 ? candidates[0].url : null;
}

function mailtoFrom(html) {
  const $ = cheerio.load(html || "");
  const href = $('a[href^="mailto:"]').first().attr("href") || "";
  const email = href.replace(/^mailto:/i, "").split("?")[0].trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? `mailto:${email}` : null;
}

function parseDiscoveryFeed(xml) {
  const $ = cheerio.load(xml, { xmlMode: true });
  const leads = [];
  $("item").each((_, item) => {
    const node = $(item);
    const feedTitle = itemText(node, "title");
    const articleUrl = itemText(node, "link");
    if (!feedTitle || !articleUrl || NON_VACANCY.test(feedTitle)) return;
    const content =
      node.find("content\\:encoded").first().text() ||
      node.find("description").first().text();
    const text = cleanText(cheerio.load(content || "").text());
    leads.push({
      feedTitle,
      title: roleTitle(feedTitle),
      employer: itemText(node, "job_listing:company"),
      location: itemText(node, "job_listing:location") || "Tanzania",
      employmentType: itemText(node, "job_listing:job_type"),
      articleUrl,
      officialUrl: officialLinkFrom(content, articleUrl),
      email: mailtoFrom(content),
      deadline: extractDeadline(text),
      text,
    });
  });
  return leads;
}

function heldJob(lead, boardName) {
  return {
    title: lead.title,
    company: lead.employer || "Employer in Tanzania",
    location: lead.location,
    description: lead.text.slice(0, 1500),
    deadline: lead.deadline,
    type: mapEmploymentType(lead.employmentType, lead.title, lead.text),
    sourceUrl: lead.officialUrl || lead.articleUrl,
    applicationUrl: lead.officialUrl || lead.email,
    reviewReasons: [
      `found on ${boardName}; the employer's own page could not be verified automatically`,
    ],
  };
}

async function resolveLead(lead, { fetchFn, boardName }) {
  if (collectedByEnabledSource(lead)) return { outcome: "collected", job: null };
  if (lead.officialUrl) {
    const verified =
      (await fetchAtsPosting(lead.officialUrl, fetchFn)) ||
      (await fetchOfficialJob({ sourceUrl: lead.officialUrl }, fetchFn).catch(() => null));
    if (verified?.title) {
      return {
        outcome: "verified",
        job: {
          ...verified,
          company: verified.company || lead.employer || "Employer in Tanzania",
          deadline: verified.deadline || null,
        },
      };
    }
  }
  if (!lead.officialUrl && !lead.email) return { outcome: "skipped", job: null };
  return { outcome: "held", job: heldJob(lead, boardName) };
}

async function parseDiscoveryLeads(leads, source, { fetchFn = fetch } = {}) {
  const boardName = new URL(source.url).hostname.replace(/^www\./, "");
  const learning = createLearningLog();
  const rawJobs = [];
  let verified = 0;
  let held = 0;
  for (const lead of leads) {
    const { outcome, job } = await resolveLead(lead, { fetchFn, boardName });
    if (outcome === "skipped") continue;
    learning.record(lead, outcome);
    if (outcome === "collected") continue;
    if (outcome === "verified") verified += 1;
    else held += 1;
    rawJobs.push(job);
  }

  const jobs = deduplicateJobs(rawJobs, {
    source: source.id,
    baseUrl: source.url,
    location: "Tanzania",
  });
  Object.defineProperty(jobs, "health", {
    enumerable: false,
    value: {
      discovered: leads.length,
      verified,
      held,
      learning: learning.summary(),
    },
  });
  return jobs;
}

async function collectDiscoveryFeedJobs(
  source,
  { fetchFn = fetch, signal = AbortSignal.timeout(REQUEST_TIMEOUT_MS) } = {}
) {
  const feedUrl = source.feed?.url;
  if (!feedUrl) throw new Error(`Discovery source ${source.id} has no feed URL.`);
  const response = await fetchFn(feedUrl, {
    headers: {
      Accept: "application/rss+xml, application/xml;q=0.9, text/xml;q=0.8",
      "User-Agent": SCRAPER_USER_AGENT,
    },
    signal,
  });
  if (!response.ok) throw new Error(`${source.name} feed returned HTTP ${response.status}.`);

  const leads = parseDiscoveryFeed(await response.text()).slice(0, source.feed?.maxItems || 30);
  const jobs = await parseDiscoveryLeads(leads, source, { fetchFn });
  const { verified, held, learning } = jobs.health;
  console.log(
    `${source.name}: ${leads.length} leads, ${verified} verified on the employer's system, ` +
    `${held} held for review; ${learning.notCollected} employer(s) not yet collected by Daraja`
  );
  for (const row of learning.suggested.slice(0, 10)) {
    console.log(
      `  Learned: ${row.employer} posts on ${row.ats.join("/") || row.officialHosts.join(", ")}` +
      (row.catalogSource ? ` (catalog source ${row.catalogSource.id} is switched off)` : " (not in catalog yet)")
    );
  }
  if (!jobs.length) jobs.health.preserveExisting = true;
  return jobs;
}

module.exports = {
  collectDiscoveryFeedJobs,
  officialLinkFrom,
  parseDiscoveryFeed,
  parseDiscoveryLeads,
  roleTitle,
};
