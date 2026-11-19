const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");

const read = (file) => readFileSync(path.join(__dirname, "..", file), "utf8");

test("the root layout reads the language cookie and provides it to every page", () => {
  const layout = read("app/layout.js");
  assert.match(layout, /normalizeLocale\(\(await cookies\(\)\)\.get\(LOCALE_COOKIE\)\?\.value\)/);
  assert.match(layout, /<html lang=\{locale\}/);
  assert.match(layout, /<LanguageProvider locale=\{locale\}>/);
});

test("English and Kiswahili are the only languages and English is the fallback", async () => {
  const i18n = read("lib/i18n.js");
  assert.match(i18n, /export const LOCALES = \["en", "sw"\]/);
  assert.match(i18n, /export const DEFAULT_LOCALE = "en"/);
  assert.match(i18n, /MESSAGES\[normalizeLocale\(locale\)\]\[text\] \|\| text/);
  const { translate } = await import(path.join(__dirname, "..", "lib", "i18n.js"));
  assert.equal(translate("sw", "Find jobs"), "Tafuta kazi");
  assert.equal(translate("sw", "Not translated yet"), "Not translated yet");
  assert.equal(translate("xx", "Find jobs"), "Find jobs");
});

test("the language switch is in the header, the phone menu and account settings", () => {
  assert.match(read("components/SiteNav.js"), /<LanguageSwitch \/>/);
  assert.match(read("components/ui/MobileDock.js"), /<LanguageSwitch full \/>/);
  assert.match(read("app/account/settings/page.js"), /<LanguageSwitch full \/>/);
});

test("page content follows the language cookie, with {placeholders}", async () => {
  const { translate, HERO_HEADLINE } = await import("../lib/i18n.js");
  assert.equal(translate("sw", "Closes in {n} days", { n: 3 }), "Inafungwa baada ya siku 3");
  assert.equal(translate("en", "{n} openings", { n: 2 }), "2 openings");
  assert.equal(translate("sw", "Not in the dictionary {n}", { n: 1 }), "Not in the dictionary 1");
  assert.deepEqual(Object.keys(HERO_HEADLINE), ["en", "sw"]);

  const home = read("app/page.js");
  assert.match(home, /const \{ t, locale \} = await getServerT\(\)/);
  assert.match(home, /HERO_HEADLINE\[locale\]/);
  for (const file of ["app/jobs/JobsPageClient.js", "components/ui/JobCard.js", "components/SiteFooter.js", "components/JobAlerts.js", "components/auth/LoginForm.js", "components/auth/SignupForm.js"]) {
    assert.match(read(file), /const t = useT\(\)/, file);
  }
});
