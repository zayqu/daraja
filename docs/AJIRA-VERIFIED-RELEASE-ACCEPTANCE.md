# Ajira verified-ingestion release acceptance

**Branch:** feature/verified-deadline-editorial-ingestion-20261110  
**PR:** https://github.com/zayqu/daraja/pull/224  
**Status:** Release candidate, NOT authorized for production. No migration or destructive cleanup is included.

## Scope freeze

1. Discover jobs from enabled sources and independently verify the original vacancy and its actual application deadline. Jobs without complete evidence stay **Needs review**.
2. Use a consistent Ajira description format, with human accuracy and originality approval for generated text. No one-click or bulk approval.
3. Keep the existing Apply action and mobile bottom navigation unchanged.
4. Keep external service cost at USD 0 and avoid unapproved server process increases.
5. Government PDF extraction remains review-only until role-specific verification and editorial approval.

## Release acceptance

- [x] Deadline, source evidence, Apply and admin moderation controls in draft.
- [x] Four real PSRS notice formats reviewed (Nanyumbu, Moshi, Momba, Kisarawe). Momba lacks a verified application link.
- [x] Admin approval confirmation in API and interface; bulk publishing prohibited.
- [x] Existing published jobs preserved when refreshed text needs review; incomplete snapshots cannot archive unmatched jobs.
- [x] Read-only impact auditor added: `node scripts/preflight-verified-jobs.js`.
- [x] Full `npm test` completed after the last edits: **441/441 passed** on GitHub Actions run 42982920209. Vercel draft build status: success.
- [ ] Per-source scraper dry runs pass and source/application URLs are confirmed.
- [x] Current public API impact counted: 82 live records, 31 undated and therefore hidden under strict deadline filtering. A restricted export of IDs/records is still required before production changes.
- [ ] Explicit approval for release and any visible catalogue reduction.
- [ ] Production deployment and post-release Apply/mobile navigation/alerts checks passed.

## Release gate

Run `node scripts/preflight-verified-jobs.js` with read-only access to the public API.

- Exit 0: No currently public job would be hidden by the new deadline rule.
- Exit 2: Some jobs would disappear; stop for source-recovery or explicit impact approval.
- Exit 1: API data incomplete or inconsistent; stop and rerun.

Live read-only API audit on 11 November 2026 (two pages, 82 unique job IDs): **82 open jobs; 31 without closing dates; 51 with future deadlines**. Missing deadlines by source: Ajira Portal 20, manual Daraja 4, Standard Bank Tanzania 3, NMB Bank Careers 2, AjiraWeb 1, retired financial institutions 1. Thus the strict public filter would hide **31** currently visible vacancies. The strict filter must not be activated before this explicit catalogue impact is approved.

## Deployment and rollback

Export affected job IDs, source references, status, deadline, application URL and moderation information to a restricted audit snapshot; do not invent deadlines or delete old records. Save the old deployment and establish a rollback target. With explicit production approval and passing tests, deploy the reviewed commit. Compare public job totals, Apply button behavior, mobile bottom navigation, review queue, alerts and source health. Revert on regression; do not automatically restore fraudulent or expired listings.

**The release is not finished until production acceptance passes.**
