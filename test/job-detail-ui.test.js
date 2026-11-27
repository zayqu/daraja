const test = require("node:test");
const assert = require("node:assert/strict");
const { readFile } = require("node:fs/promises");
const path = require("node:path");

test("job detail uses the Figma Daraja layout without changing application ownership", async () => {
  const component = await readFile(
    path.join(__dirname, "..", "app", "jobs", "[id]", "JobDetailPageClient.js"),
    "utf8"
  );
  const styles = await readFile(
    path.join(__dirname, "..", "app", "jobs", "[id]", "job-detail.module.css"),
    "utf8"
  );
  const page = await readFile(
    path.join(__dirname, "..", "app", "jobs", "[id]", "page.js"),
    "utf8"
  );

  assert.match(component, /import styles from "\.\/job-detail\.module\.css"/);
  assert.doesNotMatch(component, /<style>/);
  // Figma desktop job detail has no header search; it also overflowed the nav once EN/SW and theme controls were added.
  assert.match(component, /<SiteNav showEmployerCta=\{showEmployerCta\} \/>/);
  assert.match(component, /aria-label=\{t\("Opportunity overview"\)\}/);
  assert.match(component, /Position description/);
  assert.match(component, /Apply for this role/);
  assert.match(component, /t\("More \{category\} jobs", \{ category: t\(job\.category\) \}\)/);
  assert.match(
    component,
    /Daraja never charges job seekers fees to view or apply for jobs\./
  );
  assert.match(component, /\/api\/jobs\/\$\{encodeURIComponent\(job\.slug \|\| job\.id\)\}\/apply/);
  assert.match(component, /https:\/\/wa\.me\/\?text=/);
  assert.match(component, /aria-label=\{t\("Share on WhatsApp"\)\}/);
  assert.doesNotMatch(component, /window\.location\.href/);
  assert.match(component, /SITE_ORIGIN/);
  assert.match(component, /View details: \$\{SITE_ORIGIN\}\/jobs\//);
  assert.match(component, /Tailor CV for this job/);
  assert.match(component, /\/account\/career\/cv\?job=/);
  assert.match(component, /trackEvent\("view_item"/);
  assert.match(component, /trackEvent\("apply_job"/);
  assert.match(component, /JobBrandMedia/);
  assert.match(component, /const t = useT\(\)/);
  assert.match(component, /job\.applicationUrl/);
  assert.match(component, /Email app did not open\?/);
  assert.match(component, /Copy email details/);
  assert.match(component, /navigator\.clipboard\.writeText/);
  assert.doesNotMatch(component, /href=\{job\.sourceUrl\}/);
  assert.match(component, /<dt>\{t\("Deadline"\)\}<\/dt>/);
  assert.match(component, /job\.salary \? \{ key: "salary", label: t\("Salary"\)/);

  // Save reuses the single SaveJobButton owner (saved-jobs API, sign-in redirect).
  assert.match(component, /import SaveJobButton from "@\/components\/SaveJobButton"/);
  assert.match(component, /<SaveJobButton jobId=\{job\.id\}/);
  assert.doesNotMatch(component, /fetch\("\/api\/candidate\/saved-jobs"/);
  assert.ok(page.length > 0);

  assert.match(styles, /grid-template-areas:\s*"summary sidebar"\s*"content sidebar"/);
  assert.match(styles, /@media \(max-width: 900px\)[\s\S]*grid-template-areas:\s*"summary"\s*"sidebar"\s*"content"/);
  assert.match(styles, /@media \(max-width: 640px\)/);
  assert.match(styles, /background:\s*var\(--color-teal-deep\)/);
  assert.doesNotMatch(styles, /#[0-9a-f]{6}/i, "colours come from light/dark tokens");
});


test("job detail is server-seeded and recovers from transient cPanel database failures", async () => {
  const page = await readFile(
    path.join(__dirname, "..", "app", "jobs", "[id]", "page.js"),
    "utf8"
  );
  const layout = await readFile(
    path.join(__dirname, "..", "app", "jobs", "[id]", "layout.js"),
    "utf8"
  );
  const component = await readFile(
    path.join(__dirname, "..", "app", "jobs", "[id]", "JobDetailPageClient.js"),
    "utf8"
  );
  const loader = await readFile(
    path.join(__dirname, "..", "lib", "public-job.js"),
    "utf8"
  );

  assert.match(page, /findPublicJob\(id\)/);
  assert.match(page, /loadFailed = false/);
  assert.match(page, /if \(!job && !loadFailed\) \{[\s\S]*?findClosedPublicJob\(id\)[\s\S]*?notFound\(\);/);
  assert.match(page, /initialJob=\{serializePublicJob\(job\)\}/);
  assert.match(layout, /safeFindPublicJob/);
  assert.match(layout, /catch \(error\)/);
  assert.match(component, /useState\(initialJob \|\| null\)/);
  assert.match(component, /useState\(!initialJob\)/);
  assert.match(component, /attempt <= 3/);
  assert.match(component, /cache: "no-store"/);
  assert.match(component, /void fetchJob\(\)/);
  assert.match(component, /We could not load this position/);
  assert.match(loader, /moderationStatus: "PUBLISHED"/);
  assert.match(loader, /findJobByLegacySlug/);
  assert.match(loader, /unstable_cache/);
  assert.match(loader, /PUBLIC_JOBS_CACHE_SECONDS/);
  assert.match(loader, /attempt <= 3/);
});
