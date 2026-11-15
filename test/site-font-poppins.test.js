const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const read = (file) => fs.readFileSync(path.join(__dirname, "..", file), "utf8");

test("Ajira root layout loads Poppins for all pages", () => {
  const layout = read("app/layout.js");
  assert.match(layout, /import \{ Poppins \} from "next\/font\/google"/);
  assert.match(layout, /const poppins = Poppins\(/);
  assert.match(layout, /variable: "--font-poppins"/);
  assert.match(layout, /className=\{rootFontClass\}/);
  assert.match(layout, /<body className=\{poppins\.className\}>/);
  assert.doesNotMatch(layout, /Nunito|nunito/);
});

test("global typography resolves to Poppins", () => {
  const tokens = read("styles/tokens.css");
  const global = read("app/globals.css");
  assert.match(tokens, /--font-daraja: var\(--font-poppins\), Arial, Helvetica, sans-serif/);
  assert.match(global, /font-family: var\(--font-daraja\)/);
  assert.match(global, /h1,[\s\S]*textarea \{[\s\S]*font-family: var\(--font-daraja\)/);
});
