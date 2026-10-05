const test = require("node:test");
const assert = require("node:assert/strict");
const { readFile } = require("node:fs/promises");
const path = require("node:path");

test("Daraja uses the shared Poppins typography stack across the app", async () => {
  const globals = await readFile(
    path.join(__dirname, "..", "app", "globals.css"),
    "utf8",
  );
  const tokens = await readFile(
    path.join(__dirname, "..", "styles", "tokens.css"),
    "utf8",
  );
  const layout = await readFile(
    path.join(__dirname, "..", "app", "layout.js"),
    "utf8",
  );

  assert.match(
    tokens,
    /--font-daraja:\s*var\(--font-poppins\), Arial, Helvetica, sans-serif;/,
  );
  assert.match(globals, /body\s*\{[\s\S]*font-family:\s*var\(--font-daraja\)/);
  assert.match(
    globals,
    /h1,[\s\S]*h6,[\s\S]*font-family:\s*var\(--font-daraja\)/,
  );

  assert.match(layout, /import \{ Poppins \} from "next\/font\/google"/);
  assert.match(layout, /--font-poppins/);
  assert.match(layout, /className=\{poppins\.variable\}/);
  assert.match(layout, /weight:\s*\["400", "500", "600", "700", "800"\]/);
  const decisions = await readFile(
    path.join(__dirname, "..", "DECISIONS.md"),
    "utf8",
  );
  const privacyPage = await readFile(
    path.join(__dirname, "..", "app", "privacy", "page.js"),
    "utf8",
  );

  assert.doesNotMatch(globals, /@font-face/);
  assert.doesNotMatch(privacyPage, /fontFamily:\s*"Arial/);
  assert.match(privacyPage, /ContentPage/);
  assert.match(decisions, /D-025 - Daraja uses one canonical application typeface/);
  assert.match(decisions, /canonical Daraja web typeface is \*\*Poppins\*\*/);
  assert.match(decisions, /must not replace or override Daraja typography page by page/);
});
