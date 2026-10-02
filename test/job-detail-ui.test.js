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
  assert.match(component, /trackEvent\("view_item"/);
  assert.match(component, /trackEvent\("apply_job"/);
  assert.match(component, /JobBrandMedia/);
  assert.match(component, /job\.applicationUrl/);
  assert.match(component, /href=\{job\.sourceUrl\}/);

  assert.match(
    styles,
    /grid-template-areas:\s*"details"\s*"content"\s*"apply"\s*"browse"/
  );
  assert.match(styles, /@media \(max-width: 640px\)/);
  assert.match(styles, /background: #fbfaf7/);
  assert.match(styles, /background: #00c9a7/);
  assert.match(styles, /\.detailsCard[\s\S]*position:\s*static/);
  assert.doesNotMatch(styles, /\.detailsCard[\s\S]*position:\s*sticky/);
});
