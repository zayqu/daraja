import test from "node:test";
import assert from "node:assert/strict";
import { parseSettingValue } from "../lib/admin-settings-validation.mjs";

const textField = { type: "text" };
const numberField = { type: "number" };

test("WhatsApp number accepts + and spaces and normalizes to digits", () => {
  assert.deepEqual(parseSettingValue("promo.whatsapp", textField, "+255745990159"), { value: "255745990159" });
  assert.deepEqual(parseSettingValue("promo.whatsapp", textField, "+255 745 990 159"), { value: "255745990159" });
  assert.deepEqual(parseSettingValue("promo.whatsapp", textField, ""), { value: "" });
  assert.match(parseSettingValue("promo.whatsapp", textField, "not-phone").error, /WhatsApp/);
});

test("Lipa Namba and account name are not email-only fields", () => {
  assert.deepEqual(parseSettingValue("promo.lipaNamba", textField, "123456"), { value: "123456" });
  assert.deepEqual(parseSettingValue("promo.lipaName", textField, "DARAJA"), { value: "DARAJA" });
  assert.deepEqual(parseSettingValue("promo.lipaNamba", textField, ""), { value: "" });
  assert.match(parseSettingValue("promo.lipaNamba", textField, "account@bank.com").error, /Lipa Namba/);
});

test("email sender still requires valid email and numeric settings remain numeric", () => {
  assert.match(parseSettingValue("email.accountFrom", textField, "255745990159").error, /email address/);
  assert.deepEqual(parseSettingValue("email.accountFrom", textField, "Daraja <no-reply@daraja.co.tz>"), { value: "Daraja <no-reply@daraja.co.tz>" });
  assert.deepEqual(parseSettingValue("promo.price", numberField, "30000"), { value: 30000 });
  assert.deepEqual(parseSettingValue("promo.days", numberField, "14"), { value: 14 });
  assert.deepEqual(parseSettingValue("channel.followers", numberField, "13311"), { value: 13311 });
});
