const cron = require("node-cron");
require("dotenv").config();

const { runScrapers } = require("./run");

console.log("Daraja scheduler started...");
console.log("Enabled source scrapers will run every hour");

let running = false;

async function run() {
  if (running) {
    console.warn("Skipping scrape because the previous run is still active.");
    return;
  }

  running = true;
  try {
    console.log(`[${new Date().toISOString()}] Running scheduled scrape...`);
    await runScrapers();
  } catch (error) {
    console.error("Scheduled scrape failed:", error);
  } finally {
    running = false;
  }
}

run();
cron.schedule("0 * * * *", run);
