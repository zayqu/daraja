const test = require("node:test");
const assert = require("node:assert/strict");
const { readFile } = require("node:fs/promises");
const path = require("node:path");

async function read(relativePath) {
  return readFile(path.join(__dirname, "..", relativePath), "utf8");
}

test("candidate account pages share the Jobtex-inspired Daraja account navigation", async () => {
  const tabs = await read("components/CandidateAccountTabs.js");
  const career = await read("app/account/career/page.js");
  const alerts = await read("app/account/alerts/page.js");
  const privacy = await read("app/account/privacy/page.js");

  assert.match(tabs, /\/account\/alerts/);
  assert.match(tabs, /\/account\/privacy/);
  assert.match(tabs, /showCareer/);
  assert.match(career, /<CandidateAccountTabs showCareer \/>/);
  assert.match(alerts, /<CandidateAccountTabs showCareer=\{candidateCareerEnabled\(\)\} \/>/);
  assert.match(privacy, /<CandidateAccountTabs showCareer=\{candidateCareerEnabled\(\)\} \/>/);
});

test("candidate career and privacy UI keep protected feature boundaries visible", async () => {
  const career = await read("app/account/career/page.js");
  const privacy = await read("app/account/privacy/page.js");

  assert.match(career, /if \(!candidateCareerEnabled\(\)\) notFound\(\)/);
  assert.match(career, /Candidate documents remain private/);
  assert.match(career, /upload stays[\s\S]*disabled until malware scanning is verified/);
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
