const test = require("node:test");
const assert = require("node:assert/strict");
const { officialPdfUrl, archiveCandidates } = require("../scraper/lib/psrs-archive");

const NANYUMBU = "/api/v1/vacancies/attachment/token/0e70f879-9766-46cd-b60d-e006a2bf0dbc/download";
const MOSHI = "/api/v1/vacancies/attachment/token/617347ee-09f9-48fb-9d7f-b027e566ac9a/download";

test("official archive URLs must use the precise PSRS PDF endpoint", () => {
  assert.equal(officialPdfUrl(NANYUMBU), "https://www.ajira.go.tz" + NANYUMBU);
  for (const value of [
    "https://evil.test/api/v1/vacancies/attachment/token/0e70f879-9766-46cd-b60d-e006a2bf0dbc/download",
    "https://www.ajira.go.tz.evil.test" + NANYUMBU,
    "http://www.ajira.go.tz" + NANYUMBU,
    "https://www.ajira.go.tz" + NANYUMBU + "?target=evil",
    "//evil.test" + NANYUMBU,
    "/api/v1/vacancies/attachment/token/123/download",
    "/archive?type=vacancies",
    "https://www.ajira.go.tz@evil.test" + NANYUMBU,
  ]) assert.equal(officialPdfUrl(value), null, value);
});

test("candidate discovery associates download with the preceding official vacancy announcement", () => {
  const actions = [
    { tag: "button", text: "TANGAZO LA NAFASI ZA KAZI HALMASHAURI YA WILAYA YA NANYUMBU" },
    { tag: "button", text: "Preview" },
    { tag: "a", text: "Download", href: NANYUMBU },
    { tag: "button", text: "TANGAZO LA KUITWA KAZINI TAASISI MBALIMBALI" },
    { tag: "a", text: "Download", href: MOSHI },
    { tag: "button", text: "TANGAZO LA NAFASI ZA KAZI HALMASHAURI YA WILAYA YA MOSHI" },
    { tag: "a", text: "Download", href: MOSHI },
    { tag: "a", text: "Download", href: MOSHI },
  ];
  const items = archiveCandidates(actions);
  assert.equal(items.length, 2);
  assert.match(items[0].announcement, /NANYUMBU/);
  assert.equal(items[0].documentUrl, "https://www.ajira.go.tz" + NANYUMBU);
  assert.match(items[1].announcement, /MOSHI/);
  assert.equal(items[1].evidenceStatus, "PENDING_DOCUMENT_REVIEW");
  assert.ok(items.every((x) => !Object.hasOwn(x, "deadline")));
});

test("archive titles alone are never verified job descriptions", () => {
  assert.deepEqual(archiveCandidates([{ tag: "button", text: "TANGAZO LA NAFASI ZA KAZI HALMASHAURI YA WILAYA YA NANYUMBU" }]), []);
  assert.deepEqual(archiveCandidates([{ tag: "a", text: "Download", href: NANYUMBU }]), []);
});
