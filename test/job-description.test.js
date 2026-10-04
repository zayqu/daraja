const test = require("node:test");
const assert = require("node:assert/strict");

const load = () => import("../lib/job-description.js");

test("descriptions are grouped into professional sections in a fixed order", async () => {
  const { structureJobDescription } = await load();
  const sections = structureJobDescription(
    [
      "How to Apply",
      "Send your CV to hr@bank.co.tz.",
      "About Us",
      "We are a leading bank.",
      "Key Responsibilities:",
      "• Manage the branch team",
      "• Grow deposits and loans",
      "• Manage the branch team",
      "Requirements",
      "- Bachelor's degree in Finance",
    ].join("\n")
  );

  assert.deepEqual(
    sections.map((section) => section.title),
    ["Key responsibilities", "Requirements", "About the employer", "How to apply"]
  );
  assert.deepEqual(sections[0].items, ["Manage the branch team", "Grow deposits and loans"]);
});

test("inline headings and run-together sentences are separated", async () => {
  const { structureJobDescription } = await load();
  const sections = structureJobDescription(
    "Jaza is working to power Sub-Saharan Africa.We employ women from each community.Position Overview:The Hub Manager leads a cohort of hubs.",
    { title: "Hub Manager" }
  );

  assert.equal(sections[0].title, "Role overview");
  assert.deepEqual(sections[0].paragraphs, ["The Hub Manager leads a cohort of hubs."]);
  assert.equal(sections[1].title, "About the employer");
  assert.match(sections[1].paragraphs[0], /Africa\. We employ/);
});

test("Swahili headings are recognised and prose lists become points", async () => {
  const { structureJobDescription } = await load();
  const sections = structureJobDescription(
    "Majukumu: Kusimamia ghala. Kupokea mizigo. Sifa za Mwombaji: Elimu ya kidato cha nne. Jinsi ya Kuomba: Tuma barua pepe."
  );

  assert.deepEqual(sections.map((section) => section.key), [
    "responsibilities",
    "requirements",
    "howToApply",
  ]);
  assert.deepEqual(sections[0].items, ["Kusimamia ghala.", "Kupokea mizigo."]);
});

test("a description without headings stays a readable overview", async () => {
  const { structureJobDescription } = await load();
  const sections = structureJobDescription("Drive company vehicles safely.\n\nKeep trip logs.");
  assert.equal(sections.length, 1);
  assert.equal(sections[0].key, "overview");
  assert.deepEqual(sections[0].paragraphs, ["Drive company vehicles safely.", "Keep trip logs."]);
});
