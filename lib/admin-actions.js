// Row action definitions for /admin/bookings. `payment` is paymentProgress().
export function promotionActions(booking) {
  const url = `/api/admin/promotions/${booking.id}`;
  const actions = [];
  if (booking.status === "PENDING_REVIEW") {
    actions.push({ label: "Approve", url, body: { action: "approve" }, tone: "primary", confirm: `Approve this request? The employer can then pay TZS ${booking.amountTzs.toLocaleString("en-GB")}.` });
    actions.push({ label: "Reject", url, body: { action: "reject" }, askReason: "Why is this request rejected? The employer will see it is not approved." });
  }
  if (booking.status === "APPROVED" && ["STALLED", "UNKNOWN"].includes(booking.payment)) {
    actions.push({ label: "Release stuck payment", url, body: { action: "release" }, tone: "primary", confirm: "Only do this after checking AzamPay that NO money arrived for this payment. The employer will be able to pay again. Continue?" });
  }
  if (booking.status === "APPROVED" && ["NONE", "FAILED"].includes(booking.payment)) {
    actions.push({ label: "Cancel booking", url, body: { action: "cancel" }, tone: "danger", askReason: "Why is this booking cancelled?" });
  }
  if (booking.status === "PAID") {
    actions.push({ label: "Feature now", url, body: { action: "fulfil" }, tone: "primary", confirm: `Feature this vacancy for ${booking.featuredDays} days and mark the booking done? Remember to post it on the WhatsApp Channel too.` });
  }
  return actions;
}

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
