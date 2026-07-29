const test = require("node:test");
const assert = require("node:assert/strict");

const {
  CATEGORIES,
  acceptAssistedClassification,
  categorizeJob,
  classifyJob,
  summarizeClassifications,
} = require("../scraper/lib/categories");

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

test("classification reports deterministic confidence and evidence", () => {
  assert.deepEqual(classifyJob({ title: "Senior Graphic Designer" }), {
    category: "Creative, Design & Media",
    confidence: 0.98,
    evidence: "title",
  });
  assert.deepEqual(classifyJob({ title: "Opportunity", company: "Example Bank" }), {
    category: "Banking & Finance",
    confidence: 0.72,
    evidence: "context",
  });
});

test("assisted classification cannot override a deterministic category", () => {
  const deterministic = classifyJob({ title: "Software Engineer" });
  assert.deepEqual(
    acceptAssistedClassification(deterministic, {
      category: "Banking & Finance",
      confidence: 0.99,
    }),
    deterministic
  );
});

test("assisted classification accepts only a controlled high-confidence fallback", () => {
  const fallback = classifyJob({ title: "Specialist" });
  assert.equal(
    acceptAssistedClassification(fallback, {
      category: "Creative, Design & Media",
      confidence: 0.91,
    }).category,
    "Creative, Design & Media"
  );
  assert.deepEqual(
    acceptAssistedClassification(fallback, {
      category: "Made Up Category",
      confidence: 1,
    }),
    fallback
  );
});

test("classification summaries expose bounded review records", () => {
  const summary = summarizeClassifications([
    { sourceId: "1", title: "Software Engineer" },
    { sourceId: "2", title: "Unrecognised Specialist" },
  ]);
  assert.equal(summary.total, 2);
  assert.equal(summary.needsReview, 1);
  assert.equal(summary.review[0].sourceId, "2");
  assert.equal(summary.distribution.Technology, 1);
});
