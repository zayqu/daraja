const test = require("node:test");
const assert = require("node:assert/strict");
const { readFile } = require("node:fs/promises");
const path = require("node:path");

test("public job results use one shared hierarchy-first job card", async () => {
  const jobsPage = await readFile(
    path.join(__dirname, "..", "app", "jobs", "JobsPageClient.js"),
    "utf8"
  );
  const card = await readFile(
    path.join(__dirname, "..", "components", "ui", "JobCard.js"),
    "utf8"
  );
  const styles = await readFile(
    path.join(__dirname, "..", "components", "ui", "JobCard.module.css"),
    "utf8"
  );

  assert.match(jobsPage, /import JobCard from "@\/components\/ui\/JobCard"/);
  assert.match(jobsPage, /<JobCard[\s\S]*listName="Job search results"/);
  assert.doesNotMatch(jobsPage, /className="job-card"/);
  assert.doesNotMatch(jobsPage, /JobBrandMedia/);

  const titleIndex = card.indexOf("styles.title");
  const companyIndex = card.indexOf("styles.company");
  const locationIndex = card.indexOf("styles.location");
  const tagsIndex = card.indexOf("styles.tags");
  const deadlineIndex = card.indexOf("styles.deadline");

  assert.ok(titleIndex >= 0);
  assert.ok(titleIndex < companyIndex);
  assert.ok(companyIndex < locationIndex);
  assert.ok(locationIndex < tagsIndex);
  assert.ok(tagsIndex < deadlineIndex);

  assert.match(card, /JobBrandMedia/);
  assert.match(card, /JOB_TYPE_LABELS/);
  assert.match(card, /job\.category/);
  assert.doesNotMatch(card, /experience/i);
  assert.match(styles, /grid-template-columns:\s*52px minmax\(0, 1fr\) auto/);
  assert.match(styles, /@media \(max-width: 640px\)[\s\S]*grid-template-columns:\s*44px minmax\(0, 1fr\)/);
});
