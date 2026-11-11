const test = require("node:test");
const assert = require("node:assert/strict");
const { parseNoticeRoles } = require("../scraper/lib/psrs-notice");

const URL = "https://www.ajira.go.tz/api/v1/vacancies/attachment/token/617347ee-09f9-48fb-9d7f-b027e566ac9a/download";
const MOMBA = "https://www.ajira.go.tz/api/v1/vacancies/attachment/token/dd896f2d-054c-4d8c-a4f6-48524f1d6c58/download";
const KISARAWE = "https://www.ajira.go.tz/api/v1/vacancies/attachment/token/d1466424-7aed-447d-88a7-3a4ee66c0e8f/download";

const LONG_DUTY = "Kukagua gari kabla na baada ya safari ili kubaini hali ya usalama wa gari.";
const LONG_QUAL = "Kuajiriwa wenye cheti cha kidato cha Nne na Leseni ya Daraja E au C ya uendeshaji magari pamoja na mafunzo.";

test("Moshi notice format: wrapped title and short numbered section headers", () => {
  const lines = [
    "HALMASHAURI YA WILAYA YA MOSHI",
    "1.0 DEREVA DARAJA II (DRIVER II) - Nafasi 3",
    "1.1 MAJUKUMU YA KAZI",
    LONG_DUTY,
    "1.2 SIFA ZA MWOMBAJI",
    LONG_QUAL,
    "1.3 NGAZI YA MSHAHARA",
    "TGS B",
    "2.0 MWANDISHI MWENDESHA OFISI DARAJA LA II (OFFICE MANAGEMENT",
    "SECRETARY GRADE II) - Nafasi 4",
    "2.1 MAJUKUMU YA KAZI",
    "Kuchapa barua, taarifa na nyaraka za kawaida na za siri katika ofisi za halmashauri.",
    "2.2 SIFA ZA MWOMBAJI",
    "Wahitimu wa Kidato cha Nne au Sita wenye Stashahada ya Uhazili kutoka vyuo vinavyotambuliwa.",
    "2.3 NGAZI YA MSHAHARA",
    "TGS C",
    "MASHARTI YA JUMLA",
    "10. Mwisho wa kutuma maombi ya kazi ni tarehe 20 Novemba, 2026.",
    "12. Maombi kupitia anuani ifuatayo;https://portal.ajira.go.tz/",
  ];
  const notice = parseNoticeRoles(lines, {
    documentUrl: URL,
    expectedOrganization: "Halmashauri ya Wilaya ya Moshi",
  });
  assert.deepEqual(notice.roles.map(({ openings }) => openings), [3, 4]);
  assert.equal(notice.roles[1].title,
    "MWANDISHI MWENDESHA OFISI DARAJA LA II (OFFICE MANAGEMENT SECRETARY GRADE II)");
  assert.doesNotMatch(notice.roles[0].description, /Kuchapa barua/);
  assert.equal(notice.deadline.toISOString().slice(0, 10), "2026-11-20");
  assert.equal(notice.documentFactsComplete, true);
  assert.equal(notice.needsManualReview, true);
});

test("Momba notice format: numbered general conditions and Sifa za Kuajiriwa", () => {
  const lines = [
    "HALMASHAURI YA WILAYA YA MOMBA",
    "1.0 DEREVA DARAJA LA II - NAFASI 02",
    "1.1.1 MAJUKUMU NA KAZI",
    LONG_DUTY,
    "1.1.2 SIFA ZA KUAJIRIWA",
    LONG_QUAL,
    "1.1.3 NGAZI YA MSHAHARA",
    "TGS B",
    "1.1.4 MASHARTI YA JUMLA KWA WAOMBAJI",
    "xii. Mwisho wa kutuma maombi ya kazi ni tarehe 20 Novemba, 2026.",
    "xiv. Maombi yote yatumwe kwenye mfumo wa Kielektroniki wa Ajira (Recruitment Portal)",
  ];
  const notice = parseNoticeRoles(lines, {
    documentUrl: MOMBA,
    expectedOrganization: "Halmashauri ya Wilaya ya Momba",
  });
  assert.equal(notice.roles.length, 1);
  assert.equal(notice.roles[0].openings, 2);
  assert.doesNotMatch(notice.roles[0].description, /MASHARTI YA JUMLA|Mwisho wa kutuma/);
  assert.equal(notice.deadline.toISOString().slice(0, 10), "2026-11-20");
  assert.equal(notice.applicationUrl, null);
  assert.equal(notice.documentFactsComplete, false);
  assert.equal(notice.needsManualReview, true);
});

test("Kisarawe notice format: parenthesized openings, trailing dots, Kazi na Majukumu", () => {
  const lines = [
    "HALMASHAURI YA WILAYA YA KISARAWE",
    "1.0. MWANDISHI MWENDESHA OFISI DARAJA LA II (NAFASI 04)",
    "1.1. KAZI NA MAJUKUMU",
    "Kuchapa barua taarifa na nyaraka za kawaida na za siri pamoja na kutunza kumbukumbu.",
    "1.1.2 SIFA ZA MWOMBAJI.",
    "Awe amehitimu Kidato cha Nne au Kidato cha Sita na kupata Stashahada ya Uhazili.",
    "1.1.3 NGAZI YA MSHAHARA",
    "TGS C",
    "MASHARTI YA JUMLA KWA WAOMBAJI",
    "x. Mwisho wakutuma maombi ya kazini tarehe 20 Novemba, 2026.",
    "xii. Maombi kupitia anuani ifuatayo;https://portal.ajira.go.tz/",
  ];
  const notice = parseNoticeRoles(lines, {
    documentUrl: KISARAWE,
    expectedOrganization: "Halmashauri ya Wilaya ya Kisarawe",
  });
  assert.equal(notice.roles.length, 1);
  assert.equal(notice.roles[0].title, "MWANDISHI MWENDESHA OFISI DARAJA LA II");
  assert.equal(notice.roles[0].openings, 4);
  assert.equal(notice.deadline.toISOString().slice(0, 10), "2026-11-20");
  assert.equal(notice.documentFactsComplete, true);
  assert.equal(notice.needsManualReview, true);
});
