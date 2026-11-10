const test = require("node:test");
const assert = require("node:assert/strict");
const {
  pdfItemsToLines, exactClosingDate, parseNoticeRoles, extractPdfLines, readOfficialNotice,
} = require("../scraper/lib/psrs-notice");

const NANYUMBU = "https://www.ajira.go.tz/api/v1/vacancies/attachment/token/0e70f879-9766-46cd-b60d-e006a2bf0dbc/download";
const sourceLines = [
  "Kumb.Na.NDC/L10/1/VOL IX/3 Tarehe 06.11.2026",
  "TANGAZO LA NAFASI ZA KAZI",
  "Mkurugenzi wa Halmashauri ya Wilaya ya Nanyumbu anawatangazia watanzania",
  "1.0 MWANDISHI MWENDESHA OFISI DARAJA LA II – NAFASI 4",
  "1.1.1 MAJUKUMU YA KAZI",
  "Kuchapa barua, taarifa na nyaraka za kawaida na siri,",
  "Kupokea wageni na kuwasilisha shida zao na kuwaelekeza wanapoweza kusaidiwa.",
  "1.1.2 SIFA ZA MWOMBAJI",
  "Kuajiriwa mwenye Elimu ya Kidato cha Nne au cha Sita na Stashahada ya Uhazili.",
  "1.1.3 NGAZI YA MSHAHARA",
  "TGS C",
  "2.0 DEREVA DARAJA LA II – NAFASI 3",
  "2.1.1 MAJUKUMU YA KAZI",
  "Kukagua gari kabla na baada ya safari ili kubaini hali ya usalama wa gari.",
  "Kuwapeleka watumishi maeneo mbalimbali kwenye safari za kikazi.",
  "2.1.2 SIFA ZA WAOMBAJI",
  "Kuajiriwa mwenye Cheti cha Kidato cha Nne na Leseni ya Daraja E au C.",
  "2.1.3 NGAZI YA MSHAHARA",
  "TGS B",
  "MASHARTI YA JUMLA",
  "i. Waombaji wote wawe ni Raia wa Tanzania wenye umri usiozidi miaka 45.",
  "xii. Mwisho wa kutuma maombi ni tarehe 19 November, 2026,",
  "xiv. Maombi yote yatumwe kwenye mfumo wa kielektroniki wa Ajira",
  "(Recruitment Portal) kupitia anuani ifuatayo; https://portal.ajira.go.tz/",
];

test("PDF text items preserve physical lines without mixing adjacent roles", () => {
  const lines = pdfItemsToLines([
    { str: "1.0", transform: [1, 0, 0, 1, 72, 394] },
    { str: " MWANDISHI MWENDESHA OFISI", transform: [1, 0, 0, 1, 102, 394] },
    { str: "", hasEOL: true, transform: [1, 0, 0, 1, 72, 374] },
    { str: "1.1.1 MAJUKUMU YA KAZI", transform: [1, 0, 0, 1, 72, 374] },
  ]);
  assert.deepEqual(lines, ["1.0 MWANDISHI MWENDESHA OFISI", "1.1.1 MAJUKUMU YA KAZI"]);
});

test("multi-position official document produces separately attributable review-only roles", () => {
  const result = parseNoticeRoles(sourceLines, {
    documentUrl: NANYUMBU,
    expectedOrganization: "Halmashauri ya Wilaya ya Nanyumbu",
  });
  assert.equal(result.roles.length, 2);
  assert.equal(result.roles[0].title, "MWANDISHI MWENDESHA OFISI DARAJA LA II");
  assert.equal(result.roles[0].openings, 4);
  assert.equal(result.roles[1].title, "DEREVA DARAJA LA II");
  assert.equal(result.roles[1].openings, 3);
  assert.match(result.roles[0].description, /Kuchapa barua/);
  assert.doesNotMatch(result.roles[0].description, /Kukagua gari/);
  assert.match(result.roles[1].description, /Kukagua gari/);
  assert.doesNotMatch(result.roles[1].description, /Kuchapa barua/);
  assert.equal(result.deadline.toISOString(), "2026-11-19T23:59:59.000Z");
  assert.equal(result.applicationUrl, "https://portal.ajira.go.tz/");
  assert.equal(result.organizationMatches, true);
  assert.equal(result.documentFactsComplete, true);
  assert.equal(result.needsManualReview, true);
  assert.equal(result.roles[0].evidenceStatus, "PENDING_ROLE_REVIEW");
  assert.equal(result.roles[0].sourceVerified, false);
  assert.equal(result.roles[0].originalEvidence, undefined);
});

test("announcement date is not an application deadline", () => {
  assert.equal(exactClosingDate(sourceLines.slice(0, -3)), null);
  const result = parseNoticeRoles(sourceLines.slice(0, -3), { documentUrl: NANYUMBU });
  assert.equal(result.deadline, null);
  assert.equal(result.needsManualReview, true);
});

test("contradictory closing dates require manual review", () => {
  const lines = [...sourceLines, "xv. Mwisho wa kutuma maombi ni tarehe 20 November, 2026"];
  assert.equal(exactClosingDate(lines), null);
  const result = parseNoticeRoles(lines, { documentUrl: NANYUMBU });
  assert.equal(result.deadline, null);
  assert.equal(result.needsManualReview, true);
});

test("missing qualifications or responsibilities never creates a role", () => {
  const lines = sourceLines.filter((line) => !/Kuajiriwa mwenye Cheti/.test(line));
  const result = parseNoticeRoles(lines, { documentUrl: NANYUMBU });
  assert.equal(result.roles.length, 1);
  assert.equal(result.needsManualReview, true);
});

test("invalid PDF, scanned document and oversized documents are rejected", async () => {
  await assert.rejects(() => extractPdfLines(new Uint8Array([1, 2, 3]), {
    getDocumentFn: () => { throw new Error("Must not parse invalid PDF"); },
  }), /supported PDF/);
  const stub = () => ({
    promise: Promise.resolve({
      numPages: 1,
      getPage: async () => ({ getTextContent: async () => ({ items: [{ str: "scanned", transform: [1, 0, 0, 1, 2, 4] }] }) }),
    }),
    destroy: async () => {},
  });
  await assert.rejects(() => extractPdfLines(new TextEncoder().encode("%PDF-1.7\nfake"), {
    getDocumentFn: stub,
  }), /no extractable text/);
});

test("official PDF reader blocks redirected and non-PDF data and never publishes", async () => {
  await assert.rejects(() => readOfficialNotice("https://example.org/file.pdf"), /Not an official/);
  await assert.rejects(() => readOfficialNotice(NANYUMBU, {
    fetchFn: async () => ({
      ok: true, url: "https://example.org/redirect", headers: { get: () => "100" },
    }),
  }), /redirected/);
});


test("a contradictory named hiring institution cannot qualify as complete original evidence", () => {
  const result = parseNoticeRoles(sourceLines, {
    documentUrl: NANYUMBU,
    expectedOrganization: "Halmashauri ya Wilaya ya Temeke",
  });
  assert.equal(result.organizationMatches, false);
  assert.equal(result.documentFactsComplete, false);
  assert.equal(result.needsManualReview, true);
  assert.equal(result.roles.length, 2);
});
