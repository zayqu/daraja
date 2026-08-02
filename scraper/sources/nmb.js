const cheerio = require("cheerio");

const { cleanText, deduplicateJobs } = require("../lib/jobs");

const NMB_CAREERS_URL = "https://careers.nmbbank.co.tz/nmb_career/career.aspx";
const REQUEST_TIMEOUT_MS = 60000;

function parseDate(value) {
  const match = cleanText(value).match(/(\d{1,2})-([A-Za-z]{3})-(\d{4})/);
  if (!match) return null;
  const month = {
    jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
    jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
  }[match[2].toLowerCase()];
  return month ? `${match[1].padStart(2, "0")}/${month}/${match[3]}` : null;
}

function isVacancyHeading(value) {
  const title = cleanText(value);
  return Boolean(
    title &&
    !/^(vacancies|login to apply|job purpose|main responsibilities|knowledge and skills|qualifications and experience)$/i.test(title) &&
    /\(\d+\s+Position\(s\)\)$/i.test(title)
  );
}

function parseNmbCareers(html) {
  const $ = cheerio.load(html || "");
  const jobs = [];

  $("h1, h2, h3, h4, h5, h6").each((_, heading) => {
    const headingText = cleanText($(heading).text());
    if (!isVacancyHeading(headingText)) return;

    const title = headingText.replace(/\s*\(\d+\s+Position\(s\)\)\s*$/i, "").trim();
    const details = [];
    let current = $(heading).next();
    while (current.length && !/^h[1-6]$/i.test(current[0]?.tagName || "")) {
      const text = cleanText(current.text());
      if (text) details.push(text);
      current = current.next();
    }

    const description = details.join("\n\n");
    const location = description.match(/Job Location\s*:\s*([^\n]+)/i)?.[1]?.trim() || "Tanzania";
    const closing = description.match(/Job closing date\s*:\s*(\d{1,2}-[A-Za-z]{3}-\d{4})/i)?.[1];
    const link = $(heading).find("a[href]").attr("href") ||
      $(heading).nextUntil("h1, h2, h3, h4, h5, h6").find("a[href]").filter((__, anchor) => /apply|vacancy|job/i.test(cleanText($(anchor).text()))).first().attr("href") ||
      NMB_CAREERS_URL;

    jobs.push({
      sourceId: `nmb-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`,
      title,
      company: "NMB Bank Plc",
      location,
      description: description || `View the official NMB Bank vacancy for ${title}.`,
      deadline: parseDate(closing),
      sourceUrl: new URL(link, NMB_CAREERS_URL).toString(),
      type: "FULL_TIME",
    });
  });

  const results = deduplicateJobs(jobs, {
    source: "nmb-bank",
    baseUrl: NMB_CAREERS_URL,
    location: "Tanzania",
  });
  Object.defineProperty(results, "health", {
    enumerable: false,
    value: { preserveExisting: results.length === 0 },
  });
  return results;
}

async function collectNmbJobs({ fetchFn = fetch, signal = AbortSignal.timeout(REQUEST_TIMEOUT_MS) } = {}) {
  const response = await fetchFn(NMB_CAREERS_URL, {
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "User-Agent": "DarajaJobsBot/1.0 (+https://www.ajira.daraja.co.tz)",
    },
    signal,
  });
  if (!response.ok) throw new Error(`NMB careers returned HTTP ${response.status}.`);
  const jobs = parseNmbCareers(await response.text());
  console.log(`NMB Bank: ${jobs.length} vacancies`);
  return jobs;
}

module.exports = { NMB_CAREERS_URL, collectNmbJobs, parseNmbCareers };
