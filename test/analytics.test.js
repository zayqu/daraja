const test = require("node:test");
const assert = require("node:assert/strict");

test("analytics events are ignored safely when Google Analytics is unavailable", async () => {
  const { trackEvent } = await import("../lib/analytics.js");
  assert.doesNotThrow(() => trackEvent("apply_job", { job_id: "test" }));
});

test("analytics events preserve their name and parameters", async () => {
  const calls = [];
  global.window = {
    gtag(...args) {
      calls.push(args);
    },
  };

  const { trackEvent } = await import("../lib/analytics.js");
  trackEvent("apply_job", { job_id: "job-1", category: "Technology" });

  assert.deepEqual(calls, [[
    "event",
    "apply_job",
    { job_id: "job-1", category: "Technology" },
  ]]);
  delete global.window;
});
