const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("CV builder schema is additive, private and versioned", () => {
  const schema = read("prisma/schema.prisma");
  const migration = read(
    "prisma/migrations/20261004194000_candidate_cv_builder/migration.sql"
  );

  assert.match(schema, /model CandidateCv/);
  assert.match(schema, /jobSeekerId String/);
  assert.match(schema, /kind\s+CandidateCvKind/);
  assert.match(schema, /mode\s+CandidateCvMode/);
  assert.match(schema, /content\s+Json/);
  assert.match(schema, /theme\s+Json/);
  assert.match(schema, /atsScore\s+Int/);
  assert.match(schema, /cvs\s+CandidateCv\[\]/);
  assert.match(migration, /CREATE TABLE "CandidateCv"/);
  assert.match(migration, /ON DELETE CASCADE/);
  assert.doesNotMatch(migration, /DROP TABLE|DELETE FROM|TRUNCATE/);
});

test("CV APIs are feature-gated and owner-scoped", () => {
  const collection = read("app/api/candidate/cv/route.js");
  const detail = read("app/api/candidate/cv/[id]/route.js");

  assert.match(collection, /candidateCareerEnabled\(\)/);
  assert.match(collection, /ensureJobSeeker/);
  assert.match(collection, /jobSeekerId: user\.jobSeeker\.id/);
  assert.match(detail, /jobSeekerId: user\.jobSeeker\.id/);
  assert.match(detail, /scope: "candidate-cv-update"/);
  assert.match(detail, /scope: "candidate-cv-delete"/);
  assert.doesNotMatch(collection, /body\.userId/);
  assert.doesNotMatch(detail, /body\.userId/);
  assert.match(collection, /kind = "TAILORED"/);
});

test("CV builder keeps user facts separate from design choices", () => {
  const engine = read("lib/cv-builder.js");
  const builder = read("components/CvBuilder.js");
  const preview = read("components/CvPreview.js");

  assert.match(engine, /normalizeCvContent/);
  assert.match(engine, /normalizeCvTheme/);
  assert.match(engine, /scoreCandidateCv/);
  assert.match(engine, /\^#\[0-9a-f\]\{6\}\$/i);
  assert.match(engine, /PUBLIC_SERVICE/);
  assert.match(engine, /three reputable referees/);
  assert.match(engine, /postal address\/postcode/);
  assert.match(builder, /type="color"/);
  assert.match(builder, /Download PDF/);\n  assert.match(builder, /\/api\/candidate\/cv\/\$\{encodeURIComponent\(savedCv\.id\)\}\/pdf/);\n  assert.doesNotMatch(builder, /window\.print\(|afterprint|cv-printing/);
  assert.match(builder, /Aim for 90\+ ATS readiness/);
  assert.match(builder, /neither score guarantees shortlisting or interview/);
  assert.match(builder, /Private sector \/ NGO \/ Bank/);
  assert.match(builder, /Tanzania Public Service/);
  assert.match(preview, /<section>/);
  assert.match(preview, /<h2>/);
  assert.match(preview, /<ul>/);
  assert.doesNotMatch(preview, /<canvas|<svg|progress|skill-bar/i);
});

test("CV builder supports flexible ATS-safe presentation combinations", () => {
  const engine = read("lib/cv-builder.js");
  const builder = read("components/CvBuilder.js");
  const styles = read("components/CvBuilder.module.css");
  const globals = read("app/globals.css");

  for (const template of ["modern", "classic", "minimal", "executive", "public"]) {
    assert.match(engine, new RegExp(`"${template}"`));
    assert.match(builder, new RegExp(`value="${template}"`));
  }

  assert.match(builder, /fontFamily/);
  assert.match(builder, /density/);
  assert.match(builder, /headerAlign/);
  assert.match(builder, /headerStyle/);
  assert.match(builder, /headingStyle/);
  assert.match(builder, /bulletStyle/);
  assert.match(builder, /contactStyle/);
  assert.match(builder, /nameScale/);
  assert.match(builder, /pageMargin/);
  assert.match(builder, /Generate design/);
  assert.match(builder, /designPool/);
  assert.match(builder, /PUBLIC_SERVICE/);
  assert.match(builder, /finance/);
  assert.match(builder, /tech/);
  assert.match(builder, /social/);
  assert.match(builder, /sectionOrder/);
  assert.match(styles, /\.paper :global\(\.cv-document\)/);
  assert.doesNotMatch(globals, /cv-printing|@media print/);
});

test("CV page is protected and integrated with candidate navigation", () => {
  const page = read("app/account/career/cv/page.js");
  const tabs = read("components/CandidateAccountTabs.js");
  const career = read("app/account/career/page.js");

  assert.match(page, /if \(!candidateCareerEnabled\(\)\) notFound\(\)/);
  assert.match(page, /callbackUrl=\/account\/career\/cv/);
  assert.match(page, /<CvBuilder \/>/);
  assert.match(tabs, /\/account\/career\/cv/);
  assert.match(tabs, /CV Builder/);
  assert.match(career, /Smart CV Builder/);
  assert.match(career, /Build or update your CV/);
});

test("CV records follow account export and erasure lifecycle", () => {
  const exportSource = read("lib/account-data-export.js");
  const deletion = read("lib/account-deletion.js");

  assert.match(exportSource, /cvs: \{/);
  assert.match(exportSource, /content: true/);
  assert.match(exportSource, /theme: true/);
  assert.match(deletion, /tx\.candidateCv\.deleteMany/);
  assert.match(deletion, /jobSeekerId: account\.jobSeeker\.id/);
});


test("smart CV design engine keeps unlimited color choice readable and semantic", () => {
  const engine = read("lib/cv-builder.js");
  const builder = read("components/CvBuilder.js");
  const preview = read("components/CvPreview.js");

  assert.match(engine, /headerStyle/);
  assert.match(engine, /bulletStyle/);
  assert.match(engine, /contactStyle/);
  assert.match(engine, /nameScale/);
  assert.match(engine, /pageMargin/);
  assert.match(engine, /"Verdana"/);
  assert.match(engine, /"Tahoma"/);
  assert.match(builder, /type="color"/);
  assert.match(builder, /Hex color/);
  assert.match(preview, /readableAccentColor/);
  assert.match(preview, /--cv-accent-text/);
  assert.match(preview, /data-header-style/);
  assert.match(preview, /data-bullets/);
  assert.match(preview, /data-contacts/);
  assert.match(preview, /data-name-scale/);
  assert.match(preview, /data-page-margin/);
  assert.doesNotMatch(preview, /canvas|skill-bar|progress/i);
});


test("CV PDF export is protected, direct and text based", async () => {
  const route = read("app/api/candidate/cv/[id]/pdf/route.js");
  const generator = read("lib/cv-pdf.js");

  assert.match(route, /candidateCareerEnabled\(\)/);
  assert.match(route, /getCandidateUser\(\)/);
  assert.match(route, /jobSeekerId: user\.jobSeeker\.id/);
  assert.match(route, /Content-Type": "application\/pdf"/);
  assert.match(route, /Content-Disposition/);
  assert.match(route, /attachment/);
  assert.match(route, /buildCandidateCvPdf/);

  assert.match(generator, /%PDF-1\.4/);
  assert.match(generator, /\/Subtype \/Type1/);
  assert.match(generator, /Helvetica/);
  assert.match(generator, /Times-Roman/);
  assert.match(generator, /Tj ET/);
  assert.match(generator, /MediaBox \[0 0/);
  assert.doesNotMatch(generator, /\/Subtype \/Image|canvas|playwright|window\.print/i);

  const { buildCandidateCvPdf } = await import("../lib/cv-pdf.js");
  const pdf = buildCandidateCvPdf({
    name: "Test CV",
    mode: "GENERAL",
    language: "en",
    theme: {
      accent: "#1b2a3f",
      fontFamily: "Arial",
      density: "comfortable",
      headerAlign: "left",
      headerStyle: "rule",
      headingStyle: "line",
      bulletStyle: "disc",
      contactStyle: "dots",
      nameScale: "balanced",
      pageMargin: "standard",
      sectionOrder: ["summary", "experience", "education", "skills"],
    },
    content: {
      personal: {
        fullName: "Asha Mushi",
        headline: "Finance Officer",
        phone: "+255 700 000 000",
        email: "asha@example.com",
        location: "Dar es Salaam",
      },
      summary: "Finance professional with experience in reporting and reconciliation.",
      experience: [{
        role: "Finance Officer",
        employer: "Example Tanzania Ltd",
        location: "Dar es Salaam",
        startDate: "2024",
        endDate: "2026",
        current: false,
        bullets: ["Improved monthly reconciliation accuracy by 20%."],
      }],
      education: [{
        qualification: "Bachelor of Commerce",
        institution: "University of Dar es Salaam",
        location: "Dar es Salaam",
        startYear: "2020",
        endYear: "2023",
        details: "",
      }],
      skills: ["Financial reporting", "Reconciliation", "Excel"],
      certifications: [],
      trainings: [],
      projects: [],
      languages: [],
      references: [],
    },
  });

  assert.equal(pdf.subarray(0, 5).toString("latin1"), "%PDF-");
  const raw = pdf.toString("latin1");
  assert.match(raw, /Asha Mushi/);
  assert.match(raw, /Finance Officer/);
  assert.match(raw, /Example Tanzania Ltd/);
});
