const test = require("node:test");
const assert = require("node:assert/strict");

const JAZA =
  "Jaza is working to power Sub-Saharan Africa. We build solar-powered shops which charge batteries.We employ women from each community to run the service.Position Overview:The Hub Manager is a front-line leader responsible for the growth of a cohort of Hubs.";

test("glued source text is split into a role summary and employer section", async () => {
  const { structureJobDescription } = await import("../lib/job-description.js");
  const sections = structureJobDescription(JAZA, { company: "Jaza Energy Inc" });
  assert.deepEqual(sections.map((section) => section.title), ["Role summary", "About the employer"]);
  assert.match(sections[0].paragraphs[0], /^The Hub Manager is a front-line leader/);
  assert.equal(sections[1].paragraphs.length, 2);
});

test("English and Swahili headings become ordered sections with list items", async () => {
  const { structureJobDescription } = await import("../lib/job-description.js");
  const sections = structureJobDescription(
    [
      "Halmashauri ya Wilaya inatangaza nafasi za kazi.",
      "SIFA ZA MWOMBAJI",
      "- Shahada ya uhasibu",
      "- Uzoefu wa miaka 3",
      "MAJUKUMU YA KAZI",
      "1. Kusimamia shughuli za uhasibu.",
      "2. Kuandaa taarifa za fedha.",
      "Duties and Responsibilities: Prepare reports. Manage petty cash.",
      "How to apply",
      "Send CV to hr@example.go.tz",
    ].join("\n")
  );
  assert.deepEqual(
    sections.map((section) => section.title),
    ["Role summary", "What you'll do", "What you need", "How to apply"]
  );
  assert.deepEqual(sections[1].items, [
    "Kusimamia shughuli za uhasibu.",
    "Kuandaa taarifa za fedha.",
    "Prepare reports.",
    "Manage petty cash.",
  ]);
  assert.deepEqual(sections[2].items, ["Shahada ya uhasibu", "Uzoefu wa miaka 3"]);
});

test("repeated lines are shown once and nothing is invented", async () => {
  const { structureJobDescription } = await import("../lib/job-description.js");
  const sections = structureJobDescription(
    "Requirements:\n- Degree in Accounting\n- Degree in Accounting\n- CPA(T)"
  );
  assert.deepEqual(sections, [
    { id: "requirements", title: "What you need", items: ["Degree in Accounting", "CPA(T)"], paragraphs: [] },
  ]);
  assert.deepEqual(structureJobDescription(""), []);
  assert.equal(structureJobDescription("Plain text.")[0].title, "About the role");
});
