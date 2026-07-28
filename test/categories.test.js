const test = require("node:test");
const assert = require("node:assert/strict");

const { CATEGORIES, categorizeJob } = require("../scraper/lib/categories");

test("category catalogue contains unique user-facing categories", () => {
  assert.equal(new Set(CATEGORIES).size, CATEGORIES.length);
  assert.equal(CATEGORIES.at(-1), "General");
});

test("new creative and overlooked professional fields are categorized automatically", () => {
  assert.equal(
    categorizeJob({ title: "Senior Graphic Designer" }),
    "Creative, Design & Media"
  );
  assert.equal(
    categorizeJob({ title: "Real Estate Officer" }),
    "Construction & Real Estate"
  );
  assert.equal(
    categorizeJob({ title: "Security Officer" }),
    "Security & Protective Services"
  );
});

test("categorization prioritizes the role over the employer sector", () => {
  assert.equal(
    categorizeJob({ title: "Software Engineer", company: "Example Bank" }),
    "Technology"
  );
  assert.equal(
    categorizeJob({ title: "Internal Auditor", company: "Example University" }),
    "Accounting & Audit"
  );
  assert.equal(
    categorizeJob({ title: "Driver", company: "Example University" }),
    "Logistics & Transport"
  );
});

test("Ajira vacancies use the role category instead of one source-wide category", () => {
  assert.equal(
    categorizeJob({ title: "Software Engineer", source: "ajira" }),
    "Technology"
  );
  assert.equal(categorizeJob({ title: "MHASIBU DARAJA LA II", source: "ajira" }), "Accounting & Audit");
  assert.equal(categorizeJob({ title: "MUUGUZI DARAJA LA II", source: "ajira" }), "Health");
  assert.equal(categorizeJob({ title: "DEREVA DARAJA LA II", source: "ajira" }), "Logistics & Transport");
});
