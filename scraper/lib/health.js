const {
  appendFileSync,
  mkdirSync,
  writeFileSync,
} = require("node:fs");
const { dirname } = require("node:path");

function sanitizeError(value) {
  return String(value || "Unknown error")
    .replace(
      /(?:postgres(?:ql)?|https?):\/\/[^@\s]+@/gi,
      (match) => `${match.split("://")[0]}://[redacted]@`
    )
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .slice(0, 1000);
}

function createHealthReport({
  startedAt,
  finishedAt = new Date(),
  dryRun = false,
  lifecycle = { archivedExpired: 0 },
  summaries = [],
  failures = [],
  warnings = [],
  alerts = null,
}) {
  const successfulSources = summaries.length;
  const status = failures.length
    ? successfulSources
      ? "degraded"
      : "failed"
    : warnings.length
      ? "degraded"
      : "healthy";

  return {
    schemaVersion: 1,
    status,
    dryRun,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: Math.max(0, finishedAt.getTime() - startedAt.getTime()),
    lifecycle,
    sources: summaries,
    failures: failures.map((failure) => ({
      source: failure.source,
      error: sanitizeError(failure.error),
    })),
    warnings: warnings.map((warning) => ({
      source: warning.source,
      warning: sanitizeError(warning.warning),
    })),
    alerts,
  };
}

function renderHealthSummary(report) {
  const icon = {
    healthy: "✅",
    degraded: "⚠️",
    failed: "❌",
  }[report.status];
  const rows = report.sources.length
    ? report.sources
        .map(
          (source) =>
            `| ${source.source} | ${source.found ?? 0} | ` +
            `${source.created ?? "—"} | ${source.updated ?? "—"} | ` +
            `${source.archived ?? "—"} | ${source.durationMs ?? "—"} |`
        )
        .join("\n")
    : "| No successful sources | 0 | — | — | — | — |";
  const failures = report.failures.length
    ? `\n### Failures\n${report.failures
        .map((failure) => `- **${failure.source}:** ${failure.error}`)
        .join("\n")}\n`
    : "";
  const warnings = report.warnings.length
    ? `\n### Warnings\n${report.warnings
        .map((warning) => `- **${warning.source}:** ${warning.warning}`)
        .join("\n")}\n`
    : "";
  const classificationRows = report.sources
    .filter((source) => source.classification)
    .map(
      (source) =>
        `| ${source.source} | ${source.classification.total} | ` +
        `${source.classification.needsReview} |`
    )
    .join("\n");
  const classifications = classificationRows
    ? `\n### Classification quality\n\n` +
      `| Source | Classified | Needs review |\n` +
      `| --- | ---: | ---: |\n${classificationRows}\n`
    : "";

  return `## ${icon} Daraja scraper health: ${report.status}

- Runtime: ${report.durationMs} ms
- Expired vacancies archived: ${report.lifecycle.archivedExpired}
- Alert digests sent: ${report.alerts?.sent ?? 0}${report.alerts?.skipped ? " (delivery not configured)" : ""}

| Source | Found | Created | Updated | Archived | Duration (ms) |
| --- | ---: | ---: | ---: | ---: | ---: |
${rows}
${classifications}${warnings}${failures}`;
}

function writeHealthReport(report, {
  jsonPath = process.env.SCRAPER_HEALTH_REPORT,
  summaryPath = process.env.GITHUB_STEP_SUMMARY,
} = {}) {
  if (jsonPath) {
    mkdirSync(dirname(jsonPath), { recursive: true });
    writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  }
  if (summaryPath) {
    appendFileSync(summaryPath, `${renderHealthSummary(report)}\n`, "utf8");
  }
}

module.exports = {
  createHealthReport,
  renderHealthSummary,
  sanitizeError,
  writeHealthReport,
};
