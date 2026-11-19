const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const file = (name) => readFileSync(path.join(__dirname, "..", name), "utf8");
function hasRuleWeight(css, selector, expected) {
  let pos = 0;
  while ((pos = css.indexOf(selector + " {", pos)) >= 0) {
    const start = css.indexOf("{", pos + selector.length);
    const end = css.indexOf("}", start);
    const weight = css.slice(start, end).match(/font-weight:\s*(\d+)/);
    if (weight && Number(weight[1]) === expected) return true;
    pos = end + 1;
  }
  return false;
}
test("Headlines remain prominent but supporting homepage text is lighter", () => {
  const c = file("app/page.js");
  assert.ok(hasRuleWeight(c, ".hero h1", 700));
  assert.ok(hasRuleWeight(c, ".section-title", 600));
  assert.ok(hasRuleWeight(c, ".category-card strong", 600));
  assert.ok(hasRuleWeight(c, ".category-count", 500));
  assert.ok(hasRuleWeight(c, ".hero-submit", 600));
});
test("Job card title, company, and metadata have distinct emphasis", () => {
  const c = file("components/ui/JobCard.module.css");
  assert.ok(hasRuleWeight(c, ".title", 600));
  assert.ok(hasRuleWeight(c, ".company", 500));
  assert.ok(hasRuleWeight(c, ".tag", 500));
  assert.ok(hasRuleWeight(c, ".deadline", 500));
});
test("Navigation labels remain legible without excessive weight", () => {
  const c = file("components/ui/MobileDock.module.css");
  assert.ok(hasRuleWeight(c, ".label", 500));
  assert.ok(hasRuleWeight(c, ".active .label", 600));
  assert.ok(hasRuleWeight(file("components/SiteNav.module.css"), ".logo", 700));
});
