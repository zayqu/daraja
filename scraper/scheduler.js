const cron = require("node-cron");
require("dotenv").config();

const { scrapeAjira } = require("./sources/ajira");

console.log("Daraja scheduler started...");
console.log("Ajira scraper will run every hour");

scrapeAjira();

cron.schedule("0 * * * *", () => {
  console.log(`[${new Date().toISOString()}] Running scheduled scrape...`);
  scrapeAjira();
});