const test = require("node:test");
const assert = require("node:assert/strict");
const { readFile } = require("node:fs/promises");
const path = require("node:path");

async function read(relativePath) {
  return readFile(path.join(__dirname, "..", relativePath), "utf8");
}

test("candidate account pages share the Daraja account navigation", async () => {
  const tabs = await read("components/CandidateAccountTabs.js");
  const account = await read("app/account/page.js");
  const career = await read("app/account/career/page.js");
  const alerts = await read("app/account/alerts/page.js");
  const privacy = await read("app/account/privacy/page.js");
  const profile = await read("app/account/profile/page.js");
  const notifications = await read("app/account/notifications/page.js");

  assert.match(tabs, /href: "\/account"/);
  assert.match(tabs, /\/account\/profile/);
  assert.match(tabs, /\/account\/notifications/);
  assert.match(tabs, /\/account\/alerts/);
  assert.match(tabs, /\/account\/privacy/);
  assert.match(tabs, /showCareer/);

  assert.match(account, /My account/);
  assert.match(account, /Personal information/);
  assert.match(account, /CV Builder/);
  assert.match(account, /Career workspace/);
  assert.match(account, /Job alerts/);
  assert.match(account, /Notifications/);
  assert.match(account, /Privacy & data/);
  assert.match(account, /Sign out/);
  assert.match(account, /callbackUrl=\/account/);
  assert.doesNotMatch(account, /<PageHero/);

  assert.match(career, /<CandidateAccountTabs showCareer \/>/);
  assert.match(alerts, /<CandidateAccountTabs showCareer=\{candidateCareerEnabled\(\)\} \/>/);
  assert.match(privacy, /<CandidateAccountTabs showCareer=\{candidateCareerEnabled\(\)\} \/>/);
  assert.match(profile, /CandidateProfileForm/);
  assert.match(profile, /candidateProfileSelect/);
  assert.match(notifications, /You are all caught up/);
  assert.match(notifications, /will not show fake unread/);
});

test("candidate career and privacy UI keep protected feature boundaries visible", async () => {
  const career = await read("app/account/career/page.js");
  const privacy = await read("app/account/privacy/page.js");

  assert.match(career, /if \(!candidateCareerEnabled\(\)\) notFound\(\)/);
  assert.match(career, /Smart CV Builder/);
  assert.match(career, /ATS readiness/);
  assert.match(career, /Tanzania-first/);
  assert.match(privacy, /redirect\("\/auth\/signin\?callbackUrl=\/account\/privacy"\)/);
  assert.match(privacy, /AccountDeletionForm/);
});

test("shared job-alert styling uses an explicit CSS module", async () => {
  const alerts = await read("components/JobAlerts.js");
  const styles = await read("components/JobAlerts.module.css");

  assert.match(alerts, /import styles from "\.\/JobAlerts\.module\.css"/);
  assert.doesNotMatch(alerts, /<style jsx>/);
  assert.match(alerts, /styles\.whatsappCard/);
  assert.match(styles, /\.alerts/);
  assert.match(styles, /\.whatsappCard/);
  assert.match(styles, /@media \(max-width: 640px\)/);
});


test("My Jobs shows only the signed-in candidate's saved jobs and applications", async () => {
  const career = await read("app/account/career/page.js");
  const account = await read("app/account/page.js");
  const styles = await read("app/account/career/career.module.css");

  assert.match(career, /where: \{ userId: user\.id \}/);
  assert.match(career, /where: \{ jobSeekerId: user\.jobSeeker\.id \}/);
  assert.match(career, /user\.jobSeeker\s*\?/);
  assert.match(career, /take: 12/g);
  assert.match(career, /APPLICATION_LABELS/);
  assert.match(career, /Applications sent through external employer websites are not tracked automatically/);
  assert.match(career, /id="my-jobs"/);
  assert.match(account, /href="\/account\/career#my-jobs"/);
  assert.match(styles, /\.myJobsGrid/);
  assert.match(styles, /@media \(max-width: 760px\)/);
});


test("job detail saves through the protected candidate API and preserves official Apply", async () => {
  const detail = await read("app/jobs/[id]/JobDetailPageClient.js");
  const page = await read("app/jobs/[id]/page.js");
  const styles = await read("app/jobs/[id]/job-detail.module.css");
  assert.match(detail, /fetch\("\/api\/candidate\/saved-jobs"/);
  assert.match(detail, /credentials: "same-origin"/);
  assert.match(detail, /showCandidateSave && <button/);
  assert.match(detail, /setJobSaved\(!jobSaved\)/);
  assert.match(detail, /method: jobSaved \? "DELETE" : "POST"/);
  assert.match(detail, /aria-pressed=\{jobSaved\}/);
  assert.match(detail, /Checking saved jobs/);
  const savedApi = await read("app/api/candidate/saved-jobs/route.js");
  assert.match(savedApi, /where: \{ userId_jobId: \{ userId: user\.id, jobId \} \}/);
  assert.match(savedApi, /Cache-Control/);
  assert.match(detail, /href=\{applicationHref\}/);
  assert.match(page, /showCandidateSave=\{candidateCareerEnabled\(\)\}/);
  assert.match(styles, /\.saveJobAction/);
});


test("candidate profile explains completion and links to real My Jobs after saving", async () => {
  const form = await read("components/CandidateProfileForm.js");
  const styles = await read("components/CandidateProfileForm.module.css");

  assert.match(form, /coreFields\.filter/);
  assert.match(form, /<progress value=\{completedFields\} max=\{coreFields\.length\}/);
  assert.match(form, /Your profile stays private/);
  assert.match(form, /status === "success"/);
  assert.match(form, /href="\/account\/career#my-jobs"/);
  assert.match(styles, /\.profileProgress/);
  assert.match(styles, /\.nextLink/);
});


test("My Jobs withdrawal is explicit and owned by the authenticated candidate", async () => {
  const career = await read("app/account/career/page.js");
  const button = await read("components/ui/ApplicationWithdrawButton.js");
  const api = await read("app/api/candidate/applications/[id]/route.js");
  const styles = await read("components/ui/ApplicationWithdrawButton.module.css");

  assert.match(career, /status === "PENDING" \|\| status === "REVIEWED"/);
  assert.match(career, /<ApplicationWithdrawButton applicationId=\{id\} \/>/);
  assert.match(button, /window\.confirm\(/);
  assert.match(button, /method: "PATCH"/);
  assert.match(button, /status: "WITHDRAWN"/);
  assert.match(button, /router\.refresh\(\)/);
  assert.match(api, /jobSeekerId: user\.jobSeeker\.id/);
  assert.match(api, /status: \{ in: \["PENDING", "REVIEWED"\] \}/);
  assert.match(styles, /\.action button/);
});
