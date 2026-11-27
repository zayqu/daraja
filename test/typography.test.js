const test = require("node:test");
const assert = require("node:assert/strict");
const { readFile, readdir } = require("node:fs/promises");
const path = require("node:path");

async function collectFiles(root, extensions) {
  const entries = await readdir(root, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(fullPath, extensions)));
    } else if (extensions.some((extension) => entry.name.endsWith(extension))) {
      files.push(fullPath);
    }
  }

  return files;
}

test("Daraja uses the shared Inter + Plus Jakarta Sans typography stack across the app", async () => {
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
    /--font-daraja:\s*var\(--font-inter\), Arial, Helvetica, sans-serif;/,
  );
  assert.match(tokens, /--font-display:\s*var\(--font-jakarta\), var\(--font-daraja\);/);
  assert.match(globals, /@theme inline\s*\{[\s\S]*--font-sans:\s*var\(--font-daraja\)/);
  assert.match(globals, /html\s*\{[\s\S]*font-family:\s*var\(--font-daraja\)/);
  assert.match(globals, /body\s*\{[\s\S]*font-family:\s*var\(--font-daraja\)/);
  assert.match(globals, /button,[\s\S]*textarea \{[\s\S]*font-family:\s*var\(--font-daraja\)/);
  assert.match(globals, /h1,[\s\S]*h6 \{[\s\S]*font-family:\s*var\(--font-display\)/);

  assert.match(layout, /import \{ Inter, Plus_Jakarta_Sans \} from "next\/font\/google"/);
  assert.match(layout, /variable: "--font-inter"/);
  assert.match(layout, /variable: "--font-jakarta"/);
  assert.match(layout, /rootFontClass = `\$\{inter\.variable\} \$\{jakarta\.variable\}`/);
  assert.match(layout, /<html[^>]+className=\{rootFontClass\}/);
  assert.doesNotMatch(layout, /Poppins|Nunito/);

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
  assert.match(decisions, /canonical Ajira web typefaces are \*\*Inter\*\*[\s\S]*\*\*Plus Jakarta Sans\*\*/);
  assert.match(decisions, /must not[\s\S]*replace or override Daraja typography page by page/);
});

test("UI styles cannot introduce a competing font-family", async () => {
  const roots = ["app", "components", "styles"].map((folder) =>
    path.join(__dirname, "..", folder),
  );
  const cssFiles = (
    await Promise.all(roots.map((root) => collectFiles(root, [".css"])))
  ).flat();

  const allowedException = path.join("components", "CvBuilder.module.css");

  for (const file of cssFiles) {
    const relative = path.relative(path.join(__dirname, ".."), file);
    if (relative === allowedException) continue;

    const source = await readFile(file, "utf8");
    const declarations = source.match(/font-family\s*:\s*[^;\n}]+/gi) || [];

    for (const declaration of declarations) {
      assert.match(
        declaration,
        /font-family\s*:\s*(?:var\(--font-daraja\)|var\(--font-display\)|inherit)/i,
        `${relative} introduces a font outside the Daraja font tokens: ${declaration}`,
      );
    }
  }
});

test("Fonts are instantiated only once at the root layout", async () => {
  const roots = ["app", "components"].map((folder) =>
    path.join(__dirname, "..", folder),
  );
  const jsFiles = (
    await Promise.all(roots.map((root) => collectFiles(root, [".js", ".jsx"])))
  ).flat();

  const fontImports = [];
  for (const file of jsFiles) {
    const source = await readFile(file, "utf8");
    if (/from\s+["']next\/font\//.test(source)) {
      fontImports.push(path.relative(path.join(__dirname, ".."), file));
    }
  }

  assert.deepEqual(fontImports, [path.join("app", "layout.js")]);
});
