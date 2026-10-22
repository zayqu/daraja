// Row action definitions shared by the admin employer list and detail pages.

export function employerActions(employer) {
  const url = `/api/admin/employers/${employer.id}`;
  const actions = [];
  if (employer.verificationStatus !== "VERIFIED") {
    actions.push({ label: "Verify", url, body: { status: "VERIFIED" }, tone: "primary" });
  }
  if (employer.verificationStatus === "PENDING") {
    actions.push({ label: "Reject", url, body: { status: "REJECTED" }, askReason: `Why is ${employer.companyName} rejected?` });
  }
  if (employer.verificationStatus === "VERIFIED") {
    actions.push(
      employer.autoPublish
        ? { label: "Require review", url, body: { autoPublish: false } }
        : { label: "Trust (no review)", url, body: { autoPublish: true }, confirm: `Publish ${employer.companyName}'s vacancies without review?` }
    );
    actions.push({ label: "Suspend", url, body: { status: "SUSPENDED" }, askReason: `Why is ${employer.companyName} suspended?` });
  }
  return actions;
}
