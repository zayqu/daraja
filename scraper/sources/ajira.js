const { chromium } = require("playwright");
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
require("dotenv").config();

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

async function scrapeAjira() {
  console.log("Starting Ajira scraper...");

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto("https://portal.ajira.go.tz/vacancies", {
      waitUntil: "networkidle",
      timeout: 60000,
    });

    console.log("Waiting for table...");
    await page.waitForSelector("table tbody tr", { timeout: 30000 });

    // Set to show 50 entries per page
    await page.evaluate(() => {
      const select = document.querySelector("select");
      if (select) {
        select.value = "50";
        select.dispatchEvent(new Event("change"));
      }
    });
    await page.waitForTimeout(2000);

    let allJobs = [];
    let pageNum = 1;

    while (true) {
      console.log(`Scraping page ${pageNum}...`);

      await page.waitForSelector("table tbody tr", { timeout: 10000 });

      const jobs = await page.evaluate(() => {
        const results = [];
        const rows = document.querySelectorAll("table tbody tr");

        rows.forEach((row) => {
          const cells = row.querySelectorAll("td");
          if (cells.length < 4) return;

          const titleDiv = cells[1].querySelector("div > div:first-child");
          const postsDiv = cells[1].querySelector(".text-gray-600");
          const employerDiv = cells[2].querySelector("div");
          const dateSpan = cells[3].querySelector("span");

          const title = titleDiv ? titleDiv.innerText.trim() : null;
          if (!title || title.length < 3) return;

          results.push({
            title: title,
            company: employerDiv
              ? employerDiv.innerText.trim()
              : "Government of Tanzania",
            deadline: dateSpan ? dateSpan.innerText.trim() : null,
            numberOfPosts: postsDiv ? postsDiv.innerText.trim() : null,
            sourceUrl: "https://portal.ajira.go.tz/vacancies",
          });
        });

        return results;
      });

      allJobs = allJobs.concat(jobs);
      console.log(
        `Page ${pageNum}: ${jobs.length} jobs (total: ${allJobs.length})`
      );

      const nextDisabled = await page.$("button:has-text('Next')[disabled]");
      if (nextDisabled) break;

      const nextBtn = await page.$("button:has-text('Next')");
      if (!nextBtn) break;

      await nextBtn.click();
      await page.waitForTimeout(2000);
      pageNum++;
    }

    console.log(`Total jobs scraped: ${allJobs.length}`);

    const expired = await prisma.job.updateMany({
      where: {
        source: "ajira",
        active: true,
        deadline: { lt: new Date() },
      },
      data: { active: false },
    });

    console.log(`Archived ${expired.count} expired jobs`);

    let saved = 0;

    for (const job of allJobs) {
      const existing = await prisma.job.findFirst({
        where: {
          title: job.title,
          company: job.company,
          source: "ajira",
        },
      });

      if (existing) continue;

      let deadlineDate = null;
      if (job.deadline) {
        const parts = job.deadline.split("/");
        if (parts.length === 3) {
          deadlineDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        }
      }

      await prisma.job.create({
        data: {
          title: job.title,
          company: job.company,
          location: "Tanzania",
          description: job.numberOfPosts
            ? `${job.numberOfPosts}. Visit Ajira portal for full details.`
            : "Visit Ajira portal for full details.",
          category: "Government",
          sourceUrl: job.sourceUrl,
          source: "ajira",
          language: "sw",
          deadline: deadlineDate,
          active: true,
        },
      });

      saved++;
    }

    console.log(`Saved ${saved} new jobs to database`);
  } catch (error) {
    console.error("Scraper error:", error.message);
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  scrapeAjira();
}

module.exports = { scrapeAjira };
