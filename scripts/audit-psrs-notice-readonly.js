// One-off original PSRS PDF audit, no database connection or writes.
// Usage:
// node scripts/audit-psrs-notice-readonly.js \
//   --url=https://www.ajira.go.tz/api/v1/vacancies/attachment/token/<uuid>/download \
//   --organization="Halmashauri ya Wilaya ya ..."
const { readOfficialNotice } = require("../scraper/lib/psrs-notice");

function arg(name) {
  const prefix = "--" + name + "=";
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length);
}

async function main() {
  const documentUrl = arg("url");
  const organization = arg("organization");
  if (!documentUrl || !organization) {
    throw new Error("Specify an official --url and the expected --organization");
  }
  const notice = await readOfficialNotice(documentUrl, {
    expectedOrganization: organization,
  });
  const report = {
    documentUrl: notice.documentUrl,
    organization: notice.organization,
    organizationMatches: notice.organizationMatches,
    deadline: notice.deadline?.toISOString().slice(0, 10) || null,
    applicationDestination: notice.applicationUrl,
    documentFactsComplete: notice.documentFactsComplete,
    needsManualReview: notice.needsManualReview,
    positions: notice.roles.map((role) => ({
      title: role.title,
      openings: role.openings,
      responsibilityLines: role.duties.length,
      qualificationLines: role.qualifications.length,
      evidenceStatus: role.evidenceStatus,
    })),
  };
  console.log("PSRS_OFFICIAL_PDF_REVIEW_ONLY " + JSON.stringify(report));
  if (!report.documentFactsComplete) process.exitCode = 1;
}

main().catch((error) => {
  console.error("PSRS_OFFICIAL_PDF_AUDIT_FAILED", error.message);
  process.exitCode = 1;
});
