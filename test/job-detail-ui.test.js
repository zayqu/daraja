const test = require("node:test");
const assert = require("node:assert/strict");
const { readFile } = require("node:fs/promises");
const path = require("node:path");

test("job detail uses the shared Jobtex-inspired Daraja layout without changing application ownership", async () => {
  const component = await readFile(
    path.join(__dirname, "..", "app", "jobs", "[id]", "JobDetailPageClient.js"),
    "utf8"
  );
  const styles = await readFile(
    path.join(__dirname, "..", "app", "jobs", "[id]", "job-detail.module.css"),
    "utf8"
  );

  assert.match(component, /import styles from "\.\/job-detail\.module\.css"/);
  assert.doesNotMatch(component, /<style>/);
  assert.match(component, /<SiteNav[\s\S]*showSearch/);
  assert.match(component, /Opportunity overview/);
  assert.match(component, /Position description/);
  assert.match(component, /Apply for this role/);
  assert.match(component, /Similar opportunities/);
  assert.match(
    component,
    /Daraja never charges job seekers fees to view or apply for jobs\./
  );
  assert.match(component, /\/api\/jobs\/\$\{encodeURIComponent\(job\.slug \|\| job\.id\)\}\/apply/);
  assert.match(component, /https:\/\/wa\.me\/\?text=/);
  assert.match(component, /Tailor CV for this job/);
  assert.match(component, /\/account\/career\/cv\?job=/);
  assert.match(component, /trackEvent\("view_item"/);
  assert.match(component, /trackEvent\("apply_job"/);
  assert.match(component, /JobBrandMedia/);
  assert.match(component, /job\.applicationUrl/);
  assert.match(component, /Email app did not open\?/);
  assert.match(component, /Copy email details/);
  assert.match(component, /navigator\.clipboard\.writeText/);
  assert.doesNotMatch(component, /href=\{job\.sourceUrl\}/);
  assert.match(component, /<dt>Position<\/dt>/);
  assert.match(component, /<dt>Company \/ Institution<\/dt>/);
  assert.match(component, /<dt>Deadline<\/dt>/);

  assert.match(
    styles,
    /grid-template-areas:\s*"details"\s*"content"\s*"apply"\s*"browse"/
  );
  assert.match(styles, /@media \(max-width: 640px\)/);
  assert.match(styles, /background:\s*var\(--color-surface-warm\)/);
  assert.match(styles, /background:\s*var\(--color-teal\)/);
  assert.match(styles, /\.detailsCard[\s\S]*position:\s*static/);
  assert.doesNotMatch(styles, /\.detailsCard[\s\S]*position:\s*sticky/);
});
