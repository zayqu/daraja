import assert from "node:assert/strict";
import test from "node:test";
import {
  isValidAdSenseClient,
  isValidAdSenseSlot,
  isValidGoogleAnalyticsId,
} from "../lib/google-services.js";

test("accepts production-shaped Google Analytics measurement IDs", () => {
  assert.equal(isValidGoogleAnalyticsId("G-ABC1234"), true);
  assert.equal(isValidGoogleAnalyticsId("UA-12345"), false);
  assert.equal(isValidGoogleAnalyticsId("G-"), false);
});

test("accepts only complete AdSense publisher IDs", () => {
  assert.equal(isValidAdSenseClient("ca-pub-1234567890123456"), true);
  assert.equal(isValidAdSenseClient("pub-1234567890123456"), false);
  assert.equal(isValidAdSenseClient("ca-pub-123"), false);
});

test("accepts numeric AdSense slot IDs only", () => {
  assert.equal(isValidAdSenseSlot("1234567890"), true);
  assert.equal(isValidAdSenseSlot("slot-123"), false);
  assert.equal(isValidAdSenseSlot("123"), false);
});
