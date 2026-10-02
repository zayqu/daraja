const test = require("node:test");
const assert = require("node:assert/strict");
const { readFile } = require("node:fs/promises");
const path = require("node:path");

test("Daraja keeps its established typography stack across the app", async () => {
  const globals = await readFile(
    path.join(__dirname, "..", "app", "globals.css"),
    "utf8",
  );
  const layout = await readFile(
    path.join(__dirname, "..", "app", "layout.js"),
    "utf8",
  );

  assert.match(
    globals,
    /--font-daraja:\s*"Segoe UI", Arial, Helvetica, sans-serif;/,
  );
  assert.match(globals, /body\s*\{[\s\S]*font-family:\s*var\(--font-daraja\)/);
  assert.match(
    globals,
    /h1,[\s\S]*h6,[\s\S]*font-family:\s*var\(--font-daraja\)/,
  );

  assert.doesNotMatch(layout, /next\/font/);
  assert.doesNotMatch(globals, /@font-face/);
});
