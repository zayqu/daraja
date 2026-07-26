const CryptoJS = require("crypto-js");
require("dotenv").config();

const {
  AJIRA_SOURCE,
  AJIRA_VACANCIES_URL,
  deduplicateJobs,
} = require("../lib/jobs");
const { createPrismaClient, saveJobs } = require("../lib/store");

const AJIRA_GRAPHQL_URL = "https://portal.ajira.go.tz/candidates/graphql";
const AJIRA_DETAIL_URL = "https://portal.ajira.go.tz/view-advert";
const AJIRA_ENCRYPTION_KEY = "*n%^+-$#@$$^@1ERFWFW";
const REQUEST_TIMEOUT_MS = 60000;

const VACANCIES_QUERY = `
  query GetVacancies {
    getVacancies {
      id
      scheme {
        id
        codeNo
        emp {
          id
          name
        }
      }
      openDate
      closeDate
      noOfPost
      shortlistConfirmed
      vacancyStatus {
        isClosed
        daysClosedAgo
        statusText
        daysRemaining
      }
    }
  }
`;

function encryptAjiraId(id) {
  const value = String(id || "").trim();
  if (!/^\d+$/.test(value)) {
    throw new Error(`Invalid Ajira vacancy ID: ${value || "(empty)"}`);
  }

  const key = CryptoJS.enc.Utf8.parse(AJIRA_ENCRYPTION_KEY);
  return CryptoJS.AES.encrypt(CryptoJS.enc.Utf8.parse(value), key, {
    keySize: 128 / 32,
    iv: key,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  })
    .toString()
    .replace(/\//g, "juam");
}

function getAjiraDetailUrl(id) {
  return `${AJIRA_DETAIL_URL}/${encryptAjiraId(id)}`;
}

function formatDeadline(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

function mapAjiraVacancy(vacancy) {
  const id = String(vacancy?.id || "").trim();
  const title = vacancy?.scheme?.codeNo;
  if (!id || !title) return null;

  return {
    sourceId: id,
    title,
    company: vacancy.scheme?.emp?.name,
    deadline: formatDeadline(vacancy.closeDate),
    numberOfPosts: vacancy.noOfPost
      ? `Number of Posts: ${vacancy.noOfPost}`
      : "",
    sourceUrl: getAjiraDetailUrl(id),
  };
}

async function fetchAjiraVacancies({
  fetchFn = fetch,
  signal = AbortSignal.timeout(REQUEST_TIMEOUT_MS),
} = {}) {
  const response = await fetchFn(AJIRA_GRAPHQL_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": "DarajaJobsBot/1.0 (+https://www.ajira.daraja.co.tz)",
    },
    body: JSON.stringify({
      operationName: "GetVacancies",
      query: VACANCIES_QUERY,
      variables: {},
    }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`Ajira vacancy API returned HTTP ${response.status}.`);
  }

  const payload = await response.json();
  if (payload.errors?.length) {
    const message = payload.errors
      .map((error) => error.message)
      .filter(Boolean)
      .join("; ");
    throw new Error(`Ajira vacancy API error: ${message || "unknown error"}`);
  }

  const vacancies = payload.data?.getVacancies;
  if (!Array.isArray(vacancies)) {
    throw new Error("Ajira vacancy API returned an invalid response.");
  }
  return vacancies;
}

async function collectAjiraJobs(options = {}) {
  const vacancies = await fetchAjiraVacancies(options);
  const rawJobs = vacancies.map(mapAjiraVacancy).filter(Boolean);
  console.log(`Ajira API: ${vacancies.length} vacancies`);

  const jobs = deduplicateJobs(rawJobs, {
    source: AJIRA_SOURCE,
    baseUrl: AJIRA_VACANCIES_URL,
    category: "Government",
    language: "sw",
    description:
      "Visit the official Ajira Portal for the full vacancy notice and application instructions.",
  });

  if (!jobs.length) {
    throw new Error(
      "Ajira API produced zero valid vacancies; database was not changed."
    );
  }
  return jobs;
}

async function scrapeAjira({ dryRun = false } = {}) {
  console.log(`Starting Ajira scraper${dryRun ? " (dry run)" : ""}...`);
  const jobs = await collectAjiraJobs();

  if (dryRun) {
    const summary = {
      found: jobs.length,
      sample: jobs.slice(0, 3).map(({ title, company, deadline, sourceUrl }) => ({
        title,
        company,
        deadline,
        sourceUrl,
      })),
    };
    console.log(JSON.stringify(summary, null, 2));
    return summary;
  }

  const prisma = createPrismaClient();
  try {
    const summary = await saveJobs(prisma, jobs, AJIRA_SOURCE);
    console.log(JSON.stringify(summary));
    return summary;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  const dryRun = process.argv.includes("--dry-run");
  scrapeAjira({ dryRun }).catch((error) => {
    console.error("Ajira scraper failed:", error);
    process.exitCode = 1;
  });
}

module.exports = {
  AJIRA_GRAPHQL_URL,
  VACANCIES_QUERY,
  collectAjiraJobs,
  encryptAjiraId,
  fetchAjiraVacancies,
  getAjiraDetailUrl,
  mapAjiraVacancy,
  saveJobs,
  scrapeAjira,
};
