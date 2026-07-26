const test = require("node:test");
const assert = require("node:assert/strict");

const { CATEGORIES, categorizeJob } = require("../scraper/lib/categories");

test("category catalogue contains unique user-facing categories", () => {
  assert.equal(new Set(CATEGORIES).size, CATEGORIES.length);
  assert.equal(CATEGORIES.at(-1), "General");
});

test("categorization prioritizes the role over the employer sector", () => {
  assert.equal(
    categorizeJob({ title: "Software Engineer", company: "Example Bank" }),
    "Technology"
  );
  assert.equal(
    categorizeJob({ title: "Internal Auditor", company: "Example Hospital" }),
    "Accounting & Audit"
  );
});

test("Ajira vacancies remain in the Government category", () => {
  assert.equal(
    categorizeJob({ title: "Software Engineer", source: "ajira" }),
    "Government"
  );
});
