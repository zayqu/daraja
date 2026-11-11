// Read-only release preflight against Daraja's PUBLIC job API.
// No authentication, database connection, writes, email, or deployments.
// Run: node scripts/preflight-verified-jobs.js
const ORIGIN = "https://ajira.daraja.co.tz";
const PAGE_LIMIT = 50;
const MAX_PAGES = 30;

async function auditPublicJobs(fetchFn = fetch, now = new Date()) {
  let expectedTotal = null;
  const seen = new Set();
  const items = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = ORIGIN + "/api/jobs?status=active&limit=" + PAGE_LIMIT + "&page=" + page;
    const response = await fetchFn(url, { signal: AbortSignal.timeout(15_000) });
    if (!response.ok) throw new Error("Public job API returned HTTP " + response.status);
    const body = await response.json();
    if (!Array.isArray(body.jobs) || !Number.isInteger(body.pagination?.total)) {
      throw new Error("Unexpected public job API payload");
    }
    if (expectedTotal === null) expectedTotal = body.pagination.total;
    if (body.pagination.total !== expectedTotal) {
      throw new Error("Live vacancy count changed during audit; rerun before release");
    }
    for (const job of body.jobs) {
      if (!job?.id || seen.has(job.id)) {
        throw new Error("Duplicate or missing vacancy identity in audit");
      }
      seen.add(job.id);
      items.push(job);
    }
    if (items.length === expectedTotal) break;
    if (!body.jobs.length) throw new Error("Job pagination ended unexpectedly");
  }
  if (items.length !== expectedTotal) {
    throw new Error("Incomplete public audit: " + items.length + "/" + expectedTotal);
  }
  const affected = items.filter((job) => {
    const date = job.deadline ? new Date(job.deadline) : null;
    return !date || Number.isNaN(date.getTime()) || date.getTime() < now.getTime();
  });
  const bySource = {};
  for (const job of affected) {
    const key = String(job.source || "unknown");
    bySource[key] = (bySource[key] || 0) + 1;
  }
  return {
    auditedAt: now.toISOString(),
    currentVisibleJobs: items.length,
    jobsWithFutureDeadlines: items.length - affected.length,
    wouldBecomeHidden: affected.length,
    affectedBySource: bySource,
    affectedVacancies: affected.map((job) => ({
      id: job.id,
      title: job.title,
      employer: job.company,
      source: job.source,
      deadline: job.deadline || null,
    })),
    safeToEnableStrictVisibility: affected.length === 0,
  };
}

if (require.main === module) {
  auditPublicJobs().then((report) => {
    console.log(JSON.stringify(report, null, 2));
    // Block release when it would unexpectedly hide existing public jobs.
    if (!report.safeToEnableStrictVisibility) process.exitCode = 2;
  }).catch((error) => {
    console.error("Verified jobs release preflight failed:", error.message);
    process.exitCode = 1;
  });
}

module.exports = { auditPublicJobs };
