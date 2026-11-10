const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const source = (name) => readFileSync(join(__dirname, "..", name), "utf8");

test("manual publication requires a valid future closing date", () => {
  const create = source("app/api/admin/jobs/route.js");
  const moderate = source("app/api/admin/jobs/[id]/moderate/route.js");
  const edit = source("app/api/admin/jobs/[id]/route.js");
  assert.match(create, /publish && \(!data\.deadline \|\| data\.deadline < now\)/);
  assert.match(create, /job\.deadline && job\.deadline >= now/);
  assert.doesNotMatch(create, /active: publish && \(!data\.deadline/);
  assert.match(moderate, /!pending\?\.deadline \|\| pending\.deadline < new Date\(\)/);
  assert.match(edit, /Boolean\(data\.deadline && data\.deadline\.getTime\(\) >= now\.getTime\(\)\)/);
});
test("admin can still save incomplete drafts for verification", () => {
  const create = source("app/api/admin/jobs/route.js");
  const form = source("components/admin/JobForm.js");
  assert.match(create, /const publish = body\.publish !== false/);
  assert.match(create, /moderationStatus: publish \? "PUBLISHED" : "PENDING_REVIEW"/);
  assert.match(form, /save it in.*Needs review/);
  assert.match(form, /Required before publishing/);
});
