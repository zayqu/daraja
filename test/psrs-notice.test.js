const test = require("node:test");
const assert = require("node:assert/strict");
const {
  pdfItemsToLines, exactClosingDate, parseNoticeRoles, extractPdfLines, readOfficialNotice, matchNoticeRoleToListing,
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


test("end-to-end official PDF reader returns review-only roles and cannot auto-publish", async () => {
  const pdfBytes = new TextEncoder().encode("%PDF-1.7\nfixture document");
  let destroyed = false;
  const mockDocument = () => ({
    promise: Promise.resolve({
      numPages: 1,
      getPage: async () => ({
        getTextContent: async () => ({
          items: sourceLines.map((str, index) => ({
            str,
            transform: [1, 0, 0, 1, 70, 10000 - index * 20],
          })),
        }),
      }),
    }),
    destroy: async () => { destroyed = true; },
  });
  const result = await readOfficialNotice(NANYUMBU, {
    expectedOrganization: "Halmashauri ya Wilaya ya Nanyumbu",
    getDocumentFn: mockDocument,
    fetchFn: async (url, options) => {
      assert.equal(url, NANYUMBU);
      assert.equal(options.headers.Accept, "application/pdf");
      return {
        ok: true,
        url,
        headers: { get: () => String(pdfBytes.length) },
        arrayBuffer: async () => pdfBytes.buffer,
      };
    },
  });
  assert.equal(destroyed, true);
  assert.equal(result.roles.length, 2);
  assert.equal(result.organizationMatches, true);
  assert.equal(result.documentFactsComplete, true);
  assert.equal(result.needsManualReview, true);
  const { validateVacancy } = require("../scraper/lib/verified-publication");
  const job = {
    ...result.roles[0],
    company: result.organization,
    sourceUrl: NANYUMBU,
    applicationUrl: result.applicationUrl,
  };
  const verification = validateVacancy(job, new Date("2026-11-10"));
  assert.equal(verification.eligible, false);
  assert.match(verification.reasons.join(" "), /original source|original-source/i);
});


test("individual PSRS roles match only exact title, institution and date", () => {
  const notice = parseNoticeRoles(sourceLines, {
    documentUrl: NANYUMBU,
    expectedOrganization: "Halmashauri ya Wilaya ya Nanyumbu",
  });
  const listing = {
    title: "MWANDISHI MWENDESHA OFISI DARAJA LA II",
    company: "Halmashauri ya Wilaya ya Nanyumbu",
    deadline: "19/11/2026",
  };
  const result = matchNoticeRoleToListing(notice, listing);
  assert.equal(result.matched, true);
  assert.equal(result.publishable, false);
  assert.equal(result.evidenceStatus, "PENDING_EDITORIAL_REVIEW");
  assert.equal(result.role.openings, 4);
  for (const changed of [
    { title: "DEREVA DARAJA LA I" },
    { company: "Halmashauri ya Wilaya ya Moshi" },
    { deadline: "20/11/2026" },
    { deadline: "" },
  ]) {
    const mismatch = matchNoticeRoleToListing(notice, { ...listing, ...changed });
    assert.equal(mismatch.matched, false, JSON.stringify(changed));
    assert.equal(mismatch.publishable, false);
    assert.equal(mismatch.role, null);
  }
});

test("duplicate roles and missing verified application path are held for review", () => {
  const notice = parseNoticeRoles(sourceLines, {
    documentUrl: NANYUMBU,
    expectedOrganization: "Halmashauri ya Wilaya ya Nanyumbu",
  });
  const listing = {
    title: notice.roles[0].title,
    company: notice.organization,
    deadline: notice.deadline,
  };
  assert.equal(matchNoticeRoleToListing({
    ...notice, roles: [...notice.roles, notice.roles[0]],
  }, listing).matched, false);
  assert.equal(matchNoticeRoleToListing({
    ...notice, applicationUrl: null, documentFactsComplete: false,
  }, listing).matched, false);
});

test("a PDF with invalid openings or no application destination is not fact-complete", () => {
  const missingPortal = sourceLines.filter((line) => !line.includes("https://portal.ajira.go.tz/"));
  const first = parseNoticeRoles(missingPortal, {
    documentUrl: NANYUMBU,
    expectedOrganization: "Halmashauri ya Wilaya ya Nanyumbu",
  });
  assert.equal(first.documentFactsComplete, false);
  assert.equal(first.needsManualReview, true);
  const invalidCount = sourceLines.map((line) =>
    line.startsWith("2.0 DEREVA") ? line.replace("NAFASI 3", "NAFASI 999") : line
  );
  const second = parseNoticeRoles(invalidCount, {
    documentUrl: NANYUMBU,
    expectedOrganization: "Halmashauri ya Wilaya ya Nanyumbu",
  });
  assert.equal(second.documentFactsComplete, false);
  assert.equal(second.roles.length, 1);
});


test("an otherwise exact PDF role match is rejected after the verified deadline", () => {
  const notice = parseNoticeRoles(sourceLines, {
    documentUrl: NANYUMBU,
    expectedOrganization: "Halmashauri ya Wilaya ya Nanyumbu",
  });
  const listing = {
    title: notice.roles[1].title,
    company: notice.organization,
    deadline: "19/11/2026",
  };
  const open = matchNoticeRoleToListing(notice, listing, new Date("2026-11-11T09:00:00Z"));
  assert.equal(open.matched, true);
  const closed = matchNoticeRoleToListing(notice, listing, new Date("2026-11-20T00:00:00Z"));
  assert.equal(closed.matched, false);
  assert.match(closed.reasons.join(" "), /deadline has passed/);
  assert.equal(closed.publishable, false);
});
