// Public PSRS archive discovery; no authentication, PDF downloads, or database use.
// This produces only public advertisement metadata for source evaluation.
const { chromium } = require("playwright");

const ARCHIVE = "https://www.ajira.go.tz/archive?type=vacancies";

async function auditArchive() {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ acceptDownloads: false });
    const documents = [];
    page.on("response", (response) => {
      try {
        const url = new URL(response.url());
        if (!url.hostname.endsWith("ajira.go.tz") || response.status() >= 400) return;
        const type = (response.headers()["content-type"] || "").split(";")[0];
        if (type === "application/pdf") documents.push({ path: url.pathname, type });
      } catch {}
    });
    await page.goto(ARCHIVE, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await page.getByText(/TANGAZO LA NAFASI ZA KAZI/i).first().waitFor({ timeout: 30_000 });
    const excerpt = await page.evaluate(() => {
      const candidates = [...document.querySelectorAll("a,button")];
      return candidates
        .filter((n) => /preview|download|tangazo la nafasi za kazi/i.test(n.textContent || ""))
        .slice(0, 35).map((node) => ({
          tag: node.tagName.toLowerCase(),
          text: (node.textContent || "").replace(/\s+/g, " ").trim().slice(0, 160),
          href: node.getAttribute("href"),
        }));
    });
    const pdfLinks = excerpt.filter((v) => /\.pdf(?:\?|$)/i.test(v.href || ""));
    const summary = {
      officialArchive: ARCHIVE,
      noticeActionCount: excerpt.length,
      directPdfLinks: pdfLinks.length,
      actions: excerpt.slice(0, 15),
      downloadedDocuments: documents.length,
    };
    console.log("PSRS_OFFICIAL_ARCHIVE_READONLY " + JSON.stringify(summary));
    // The archive can list announcements that are not in the live vacancy
    // portal. Titles alone are not the vacancy-level evidence required to publish.
    if (!excerpt.length) process.exitCode = 1;
  } finally {
    await browser.close();
  }
}
auditArchive().catch((error) => {
  console.error("PSRS_OFFICIAL_ARCHIVE_FAILED", error.message);
  process.exitCode = 1;
});
