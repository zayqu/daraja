// Review-only evidence extraction for public PSRS recruitment PDFs.
// Never emit originalEvidence.verified: true or publish directly from PDF text.
const { parseDeadline } = require("./jobs");
const { officialPdfUrl } = require("./psrs-archive");

const MAX_PDF_BYTES = 6 * 1024 * 1024;
const MAX_PAGES = 30;
const ROLE_HEADING = /^\s*(\d{1,2})\.0\s+(.+?)\s*[-–—]\s*NAFASI\s+(\d{1,4})\s*$/i;
const GENERAL_HEADING = /^\s*MASHARTI\s+YA\s+JUMLA\s*$/i;
const DUTIES_HEADING = /^\s*(?:\d+(?:\.\d+){1,3}\s+)?(?:MAJUKUMU\s+YA\s+KAZI|DUTIES\s+AND\s+RESPONSIBILITIES)\s*$/i;
const QUALIFICATIONS_HEADING = /^\s*(?:\d+(?:\.\d+){1,3}\s+)?(?:SIFA\s+ZA\s+(?:MWOMBAJI|WAOMBAJI)|QUALIFICATIONS(?:\s+REQUIRED)?)\s*$/i;
const SALARY_HEADING = /^\s*(?:\d+(?:\.\d+){1,3}\s+)?(?:NGAZI\s+YA\s+MSHAHARA|SALARY\s+SCALE)\s*$/i;
const DEADLINE_LEAD = /(?:mwisho\s+wa\s+(?:kutuma|kupokea|kuwasilisha)\s+maombi|tarehe\s+ya\s+mwisho\s+ya\s+(?:kutuma|kupokea)\s+maombi|(?:application|submission)\s+(?:deadline|closing\s+date))/i;
const DATE_FRAGMENT = /(\d{1,2}[./-]\d{1,2}[./-]\d{4}|\d{1,2}\s+(?:of\s+)?[A-Za-z]+\s*,?\s*\d{4})/i;
const WORDS = /\p{L}/u;

function pdfItemsToLines(items) {
  const lines = [];
  let parts = [];
  let previousY = null;
  function flush() {
    const text = parts.join("").replace(/[ \t]+/g, " ").trim();
    if (text) lines.push(text);
    parts = [];
  }
  for (const item of items || []) {
    if (!item || typeof item.str !== "string") continue;
    const y = Number(item.transform?.[5]);
    if (Number.isFinite(y) && previousY !== null && Math.abs(previousY - y) > 2) flush();
    if (Number.isFinite(y)) previousY = y;
    parts.push(item.str);
  }
  flush();
  return lines;
}

async function extractPdfLines(pdfBytes, { getDocumentFn } = {}) {
  if (!getDocumentFn) {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    getDocumentFn = pdfjs.getDocument;
  }
  if (!(pdfBytes instanceof Uint8Array) || pdfBytes.length > MAX_PDF_BYTES ||
      String.fromCharCode(...pdfBytes.subarray(0, 5)) !== "%PDF-") {
    throw new Error("PSRS document is not a supported PDF");
  }
  const task = getDocumentFn({
    data: new Uint8Array(pdfBytes), useSystemFonts: true, disableFontFace: true,
  });
  try {
    const document = await task.promise;
    if (document.numPages < 1 || document.numPages > MAX_PAGES) {
      throw new Error("PSRS notice requires manual page-count review");
    }
    const lines = [];
    for (let i = 1; i <= document.numPages; i++) {
      const page = await document.getPage(i);
      const content = await page.getTextContent();
      lines.push(...pdfItemsToLines(content.items));
    }
    if (lines.join(" ").replace(/\s+/g, "").length < 150) {
      throw new Error("PSRS document has no extractable text; inspect scanned PDF manually");
    }
    return lines;
  } finally {
    await task.destroy?.();
  }
}

function exactClosingDate(lines) {
  const matches = [];
  for (let i = 0; i < lines.length; i++) {
    if (!DEADLINE_LEAD.test(lines[i])) continue;
    const candidate = [lines[i], lines[i + 1] || ""].join(" ");
    const text = candidate.match(DATE_FRAGMENT)?.[1];
    const date = text ? parseDeadline(text.replace(/,/g, "")) : null;
    if (date && !Number.isNaN(date.getTime())) matches.push(date.toISOString().slice(0, 10));
  }
  const unique = [...new Set(matches)];
  return unique.length === 1 ? parseDeadline(unique[0]) : null;
}

function normalizeRoleValue(value) {
  return String(value || "").normalize("NFKC").toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ").trim().replace(/\s+/g, " ");
}

// Exact, unambiguous matching is a review aid. It never approves a job.
function matchNoticeRoleToListing(notice, listing) {
  const reasons = [];
  if (!notice?.documentFactsComplete || !notice?.needsManualReview) {
    reasons.push("Incomplete original PDF facts or missing review state");
  }
  if (!officialPdfUrl(notice?.documentUrl)) reasons.push("Not an official PDF URL");
  const title = normalizeRoleValue(listing?.title);
  if (!title) reasons.push("Missing original listing position");
  if (!normalizeRoleValue(listing?.company) ||
      normalizeRoleValue(listing?.company) !== normalizeRoleValue(notice?.organization)) {
    reasons.push("Listing institution differs from PDF institution");
  }
  const listingDeadline = listing?.deadline instanceof Date
    ? listing.deadline : parseDeadline(listing?.deadline);
  const noticeDeadline = notice?.deadline instanceof Date
    ? notice.deadline : parseDeadline(notice?.deadline);
  if (!listingDeadline || !noticeDeadline ||
      listingDeadline.toISOString().slice(0, 10) !== noticeDeadline.toISOString().slice(0, 10)) {
    reasons.push("Listing deadline differs from official notice");
  }
  const matches = (Array.isArray(notice?.roles) ? notice.roles : []).filter(
    (role) => normalizeRoleValue(role.title) === title
  );
  if (matches.length !== 1) reasons.push("Role title is not a unique exact PDF match");
  const role = matches.length === 1 ? matches[0] : null;
  if (role && (role.sourceVerified !== false ||
      role.evidenceStatus !== "PENDING_ROLE_REVIEW")) {
    reasons.push("Role lacks controlled pending-review state");
  }
  if (!notice?.applicationUrl) reasons.push("Missing original application destination");
  return {
    matched: reasons.length === 0,
    reasons,
    documentUrl: notice?.documentUrl || null,
    evidenceStatus: "PENDING_EDITORIAL_REVIEW",
    role: reasons.length === 0 ? role : null,
    publishable: false,
  };
}

function parseNoticeRoles(lines, { documentUrl, expectedOrganization = null } = {}) {
  if (!officialPdfUrl(documentUrl)) throw new Error("Source is not an official PSRS document link");
  const records = [];
  let current = null;
  let section = "";
  let generalIndex = lines.length;
  const roleNumbers = new Set();
  for (let i = 0; i < lines.length; i++) {
    const line = String(lines[i] || "").replace(/\s+/g, " ").trim();
    if (GENERAL_HEADING.test(line)) { generalIndex = i; break; }
    const heading = line.match(ROLE_HEADING);
    if (heading) {
      if (current) records.push(current);
      const count = Number(heading[3]);
      current = {
        title: heading[2].trim(), openings: count, duties: [], qualifications: [],
        documentUrl, evidenceStatus: "PENDING_ROLE_REVIEW",
      };
      section = "";
      if (roleNumbers.has(heading[1])) throw new Error("Duplicate position numbering in PSRS notice");
      roleNumbers.add(heading[1]);
      continue;
    }
    if (!current) continue;
    if (DUTIES_HEADING.test(line)) { section = "duties"; continue; }
    if (QUALIFICATIONS_HEADING.test(line)) { section = "qualifications"; continue; }
    if (SALARY_HEADING.test(line)) { section = ""; continue; }
    if (section && line && WORDS.test(line)) current[section].push(line);
  }
  if (current) records.push(current);
  const deadline = exactClosingDate(lines.slice(generalIndex));
  const fullText = lines.join("\n");
  const organizationMatches = Boolean(expectedOrganization &&
    normalizeRoleValue(fullText).includes(normalizeRoleValue(expectedOrganization)));
  // Only original government notice references may substantiate a deadline.
  // Any ambiguity, missing role section or unidentified organization stays in review.
  return {
    documentUrl,
    organization: expectedOrganization || null,
    organizationMatches,
    deadline,
    applicationUrl: /https:\/\/portal\.ajira\.go\.tz\/?/i.test(fullText)
      ? "https://portal.ajira.go.tz/" : null,
    roles: records.filter((role) =>
      role.openings > 0 && role.openings <= 500 &&
      role.title.length > 4 && role.duties.join(" ").length >= 45 &&
      role.qualifications.join(" ").length >= 30
    ).map((role) => ({
      ...role,
      description: ["Responsibilities", ...role.duties, "Qualifications", ...role.qualifications].join("\n"),
      deadline,
      // A verified document URL alone is not proof of publisher approval,
      // employer match or original editorial copy.
      sourceVerified: false,
    })),
    documentFactsComplete: Boolean(deadline && organizationMatches &&
      /https:\/\/portal\.ajira\.go\.tz\/?/i.test(fullText) &&
      records.length && records.every((r) =>
        r.openings > 0 && r.openings <= 500 && r.title.length > 4 &&
        r.duties.join(" ").length >= 45 && r.qualifications.join(" ").length >= 30
      )),
    // Extraction does not prove that an editor checked the exact
    // original against the draft. Publication is always manual.
    needsManualReview: true,
  };
}

async function readOfficialNotice(documentUrl, {
  fetchFn = fetch,
  getDocumentFn,
  expectedOrganization = null,
} = {}) {
  const official = officialPdfUrl(documentUrl);
  if (!official) throw new Error("Not an official PSRS PDF attachment");
  const response = await fetchFn(official, {
    headers: { Accept: "application/pdf" },
    redirect: "follow",
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok || officialPdfUrl(response.url || official) !== official) {
    throw new Error("Official notice unavailable or redirected");
  }
  const length = Number(response.headers?.get?.("content-length") || 0);
  if (length > MAX_PDF_BYTES) throw new Error("Official PDF exceeds permitted size");
  const chunks = [];
  let total = 0;
  if (response.body?.getReader) {
    const reader = response.body.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.length;
        if (total > MAX_PDF_BYTES) throw new Error("Official PDF exceeds permitted size");
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
  } else {
    const b = new Uint8Array(await response.arrayBuffer());
    total = b.length;
    chunks.push(b);
  }
  if (total > MAX_PDF_BYTES) throw new Error("Official PDF exceeds permitted size");
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  const lines = await extractPdfLines(bytes, { getDocumentFn });
  return parseNoticeRoles(lines, { documentUrl: official, expectedOrganization });
}

module.exports = { pdfItemsToLines, extractPdfLines, exactClosingDate, parseNoticeRoles, readOfficialNotice, matchNoticeRoleToListing };
