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

test("no queued job can be published without explicit source/editorial confirmation", () => {
  const api = source("app/api/admin/jobs/[id]/moderate/route.js");
  const reviewQueue = source("components/AdminJobReviewQueue.js");
  const tableActions = source("components/admin/AdminRowActions.js");
  const jobsPage = source("app/admin/jobs/page.js");
  assert.match(api, /body\.sourceReviewed !== true/);
  assert.match(api, /pending\.source !== "daraja"/);
  assert.match(reviewQueue, /checked=\{sourceReviewed\}/);
  assert.match(reviewQueue, /sourceReviewed: status === "PUBLISHED"/);
  assert.match(tableActions, /confirmation !== "VERIFIED"/);
  assert.match(tableActions, /sourceReviewed: true/);
  assert.match(jobsPage, /verifySource: true/);
});

test("bulk publication is blocked server-side and omitted from admin job actions", () => {
  const api = source("app/api/admin/jobs/route.js");
  const page = source("app/admin/jobs/page.js");
  assert.match(api, /if \(status === "PUBLISHED"\) return NextResponse\.json/);
  assert.doesNotMatch(page, /\{ label: "Publish", status: "PUBLISHED"/);
  assert.match(page, /label: "Archive"/);
  assert.match(page, /label: "Reject"/);
});
