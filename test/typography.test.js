const test = require("node:test");
const assert = require("node:assert/strict");
const { readFile } = require("node:fs/promises");
const path = require("node:path");

test("Daraja keeps its established typography stack across the app", async () => {
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
    /--font-daraja:\s*var\(--font-geist-sans\), Arial, Helvetica, sans-serif;/,
  );
  assert.match(globals, /body\s*\{[\s\S]*font-family:\s*var\(--font-daraja\)/);
  assert.match(
    globals,
    /h1,[\s\S]*h6,[\s\S]*font-family:\s*var\(--font-daraja\)/,
  );

  assert.match(layout, /import \{ Geist, Geist_Mono \} from "next\/font\/google"/);
  assert.match(layout, /geistSans\.variable/);
  assert.match(layout, /geistMono\.variable/);
  const privacyPage = await readFile(
    path.join(__dirname, "..", "app", "privacy", "page.js"),
    "utf8",
  );

  assert.doesNotMatch(globals, /@font-face/);
  assert.doesNotMatch(privacyPage, /fontFamily:\s*"Arial/);
  assert.match(privacyPage, /ContentPage/);
});
