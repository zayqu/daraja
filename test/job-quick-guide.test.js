import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { buildJobQuickGuide } from "../lib/job-quick-guide.js";

test("Ajira-sourced government vacancies point to the Ajira Portal guide", () => {
  const guide = buildJobQuickGuide({
    source: "ajira",
    category: "Government",
    type: "FULL_TIME",
    experienceMinYears: 3,
    deadline: "2026-11-01T00:00:00.000Z",
  });
  assert.match(guide.steps.join(" "), /Ajira Portal/);
  assert.ok(guide.links.some((link) => link.href === "/career-guides/how-to-apply-on-ajira-portal"));
  assert.ok(guide.links.some((link) => link.href === "/sectors/government"));
  assert.ok(guide.fit.some((line) => /at least 3 years/.test(line)));
  assert.ok(guide.fit.some((line) => /minimum qualifications/.test(line)));
});

test("email applications use the email guide and internships the first-job guide", () => {
  const guide = buildJobQuickGuide({
    applicationUrl: "mailto:jobs@example.co.tz?subject=Intern",
    category: "Internships & Graduate Programs",
    type: "INTERNSHIP",
  });
  assert.match(guide.steps.join(" "), /exact subject line/);
  assert.match(guide.steps.join(" "), /confirm the closing date/);
  const hrefs = guide.links.map((link) => link.href);
  assert.ok(hrefs.includes("/career-guides/applying-for-jobs-by-email"));
  assert.ok(hrefs.includes("/career-guides/first-job-after-graduation"));
  assert.ok(hrefs.includes("/sectors/internships-and-graduate-programs"));
  assert.match(guide.fit[0], /Students and recent graduates/);
});

test("every vacancy gets a scam warning, a fallback fit line and no sector link for General", () => {
  const guide = buildJobQuickGuide({ category: "General", applicationUrl: "https://careers.example.co.tz/1" });
  assert.match(guide.steps.join(" "), /Never pay anyone/);
  assert.equal(guide.fit.length, 1);
  assert.ok(!guide.links.some((link) => link.href.startsWith("/sectors/")));
  assert.equal(new Set(guide.links.map((link) => link.href)).size, guide.links.length);
  assert.equal(buildJobQuickGuide(null), null);
});

test("job detail renders the quick guide inside the existing content card", async () => {
  const source = await readFile(
    path.join(process.cwd(), "app", "jobs", "[id]", "JobDetailPageClient.js"),
    "utf8"
  );
  assert.match(source, /buildJobQuickGuide\(job\)/);
  assert.match(source, /Before you apply/);
  assert.match(source, /className=\{styles\.quickGuide\}/);
});
