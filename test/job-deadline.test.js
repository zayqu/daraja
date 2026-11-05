import assert from "node:assert/strict";
import test from "node:test";
import {
  deadlineDay, daysUntilDeadline, formatDeadline, deadlineStatus, todayInTanzania,
} from "../lib/job-deadline.js";

test("deadline calendar dates do not shift backwards for a UTC midnight record", () => {
  const day = "2026-11-18T00:00:00.000Z";
  assert.equal(deadlineDay(day), "2026-11-18");
  assert.equal(formatDeadline(day), "18 Nov 2026");
  assert.equal(formatDeadline(day, { month: "long" }), "18 November 2026");
});

test("countdown follows Tanzania calendar midnight, not fractional hours", () => {
  const deadline = "2026-11-18T00:00:00.000Z";
  assert.equal(todayInTanzania(new Date("2026-11-17T20:59:00Z")), "2026-11-17");
  assert.equal(todayInTanzania(new Date("2026-11-17T21:01:00Z")), "2026-11-18");
  assert.equal(daysUntilDeadline(deadline, new Date("2026-11-16T22:00:00Z")), 1);
  assert.equal(deadlineStatus(deadline, new Date("2026-11-16T22:00:00Z")), "Closes tomorrow");
  assert.equal(deadlineStatus(deadline, new Date("2026-11-17T22:00:00Z")), "Closes today");
  assert.equal(deadlineStatus(deadline, new Date("2026-11-18T22:00:00Z")), "Closed");
});

test("invalid and absent deadlines are not silently converted", () => {
  assert.equal(deadlineDay(null), null);
  assert.equal(deadlineDay("2026-02-30"), null);
  assert.equal(daysUntilDeadline(undefined), null);
  assert.equal(deadlineStatus(undefined), null);
});
