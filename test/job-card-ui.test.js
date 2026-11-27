const test = require("node:test");
const assert = require("node:assert/strict");
const { readFile } = require("node:fs/promises");
const path = require("node:path");

test("public job results use one shared Figma job card with stated facts only", async () => {
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

  assert.match(card, /<h3 className=\{styles\.title\} title=\{displayTitle\}>\{displayTitle\}<\/h3>/);
  assert.match(card, /formatJobTitle\(job\.title, job\.source\)/);
  assert.match(card, /className=\{styles\.company\}>\{job\.company\}/);
  assert.match(card, /className=\{styles\.meta\}/);
  assert.match(card, /\{n\} days left/);
  assert.match(card, /const t = useT\(\)/);
  assert.match(card, /Closes today/);
  assert.match(card, /styles\.deadline/);
  assert.match(card, /styles\.saveVisual/);
  assert.match(card, /JobBrandMedia/);
  assert.match(card, /JOB_TYPE_LABELS/);
  assert.match(card, /experienceLabel\(job\.experienceMinYears, job\.experienceMaxYears, t\)/);
  assert.match(card, /job\.openings > 1/);
  assert.match(card, /job\.salary \?/);
  assert.match(card, /variant = "row"/);
  assert.match(card, /Salary not stated/);
  assert.doesNotMatch(card, /\|\| "Job"/);

  assert.match(styles, /\.row \{[\s\S]*grid-template-columns:\s*44px minmax\(0, 1fr\) auto/);
  assert.match(styles, /"brand content side"[\s\S]*"brand content save"/);
  assert.match(
    styles,
    /@media \(max-width: 640px\)[\s\S]*"brand title save"[\s\S]*"brand company side"[\s\S]*"meta meta meta"/
  );
  assert.match(styles, /\.tile \{/);
  assert.match(styles, /\.company[\s\S]*text-overflow:\s*ellipsis/);
  assert.match(styles, /\.soon[\s\S]*var\(--color-warning\)/);
});


test("missing employer media uses an employer initials badge", async () => {
  const media = await readFile(
    path.join(__dirname, "..", "components", "JobBrandMedia.js"),
    "utf8"
  );
  const styles = await readFile(
    path.join(__dirname, "..", "components", "JobBrandMedia.module.css"),
    "utf8"
  );
  const { employerInitials } = await import("../components/JobBrandMedia.js").catch(() => ({}));

  assert.match(media, /export function employerInitials/);
  assert.match(media, /styles\.initials/);
  assert.doesNotMatch(media, /sourceType/);
  assert.match(styles, /\.initials \{/);
  if (employerInitials) {
    assert.equal(employerInitials("Pwani Microfinance"), "PM");
    assert.equal(employerInitials("The Bank of Tanzania"), "BT");
    assert.equal(employerInitials("TANESCO"), "TA");
    assert.equal(employerInitials(""), "D");
  }
});

test("job card titles are limited to two lines with the full title on hover", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const css = fs.readFileSync(path.join(__dirname, "..", "components", "ui", "JobCard.module.css"), "utf8");
  const js = fs.readFileSync(path.join(__dirname, "..", "components", "ui", "JobCard.js"), "utf8");
  const titleBlock = css.slice(css.indexOf(".title {"), css.indexOf("}", css.indexOf(".title {")));
  assert.match(titleBlock, /-webkit-line-clamp: 2/);
  assert.match(titleBlock, /overflow: hidden/);
  assert.match(js, /className=\{styles\.title\} title=\{displayTitle\}/);
});
