const test = require("node:test");
const assert = require("node:assert/strict");

test("JSON body reader accepts a valid bounded request", async () => {
  const { readJsonBody } = await import("../lib/http.js");
  const request = new Request("https://example.test/api", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ title: "Credit Analyst" }),
  });
  assert.deepEqual(await readJsonBody(request, 1024), {
    title: "Credit Analyst",
  });
});

test("JSON body reader rejects unsupported, malformed and oversized input", async () => {
  const { readJsonBody } = await import("../lib/http.js");
  const cases = [
    [
      new Request("https://example.test/api", {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: "{}",
      }),
      415,
    ],
    [
      new Request("https://example.test/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{",
      }),
      400,
    ],
    [
      new Request("https://example.test/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: "x".repeat(2048) }),
      }),
      413,
    ],
  ];

  for (const [request, status] of cases) {
    await assert.rejects(
      readJsonBody(request, 1024),
      (error) => error.status === status
    );
  }
});

test("public job projection excludes internal fields", async () => {
  const { PUBLIC_JOB_SELECT } = await import("../lib/public-job.js");
  assert.equal(PUBLIC_JOB_SELECT.description, true);
  assert.equal(PUBLIC_JOB_SELECT.sourceUrl, true);
  assert.equal(PUBLIC_JOB_SELECT.sourceId, undefined);
  assert.equal(PUBLIC_JOB_SELECT.active, undefined);
  assert.equal(PUBLIC_JOB_SELECT.employerId, undefined);
  assert.equal(PUBLIC_JOB_SELECT.applications, undefined);
});
