import assert from "node:assert/strict";
import test from "node:test";
import { createWebVitalEvent } from "../lib/web-vitals.js";

test("creates bounded GA4 events for supported Core Web Vitals", () => {
  assert.deepEqual(
    createWebVitalEvent({ name: "LCP", id: "v4-123", delta: 1234.6 }),
    {
      eventName: "LCP",
      params: {
        event_category: "Web Vitals",
        event_label: "v4-123",
        value: 1235,
        non_interaction: true,
      },
    }
  );

  assert.equal(
    createWebVitalEvent({ name: "CLS", id: "v4-cls", delta: 0.123 }).params.value,
    123
  );
});

test("rejects unsupported or invalid performance metrics", () => {
  assert.equal(createWebVitalEvent({ name: "CUSTOM", delta: 10 }), null);
  assert.equal(createWebVitalEvent({ name: "LCP", delta: -1 }), null);
  assert.equal(createWebVitalEvent({ name: "LCP", delta: "invalid" }), null);
});
