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
- [ ] Latest regression suite and full `npm test` and `npm run build` completed after the last edits.
- [ ] Per-source scraper dry runs pass and source/application URLs are confirmed.
- [ ] Current production impact audit lists all open jobs that would disappear under deadline-only filtering.
- [ ] Explicit approval for release and any visible catalogue reduction.
- [ ] Production deployment and post-release Apply/mobile navigation/alerts checks passed.

## Release gate

Run `node scripts/preflight-verified-jobs.js` with read-only access to the public API.

- Exit 0: No currently public job would be hidden by the new deadline rule.
- Exit 2: Some jobs would disappear; stop for source-recovery or explicit impact approval.
- Exit 1: API data incomplete or inconsistent; stop and rerun.

A prior live audit observed 66 open jobs with 28 missing deadlines. Those counts require a new audit. The strict public filter must not be activated before its effect is approved.

## Deployment and rollback

Export affected job IDs, source references, status, deadline, application URL and moderation information to a restricted audit snapshot; do not invent deadlines or delete old records. Save the old deployment and establish a rollback target. With explicit production approval and passing tests, deploy the reviewed commit. Compare public job totals, Apply button behavior, mobile bottom navigation, review queue, alerts and source health. Revert on regression; do not automatically restore fraudulent or expired listings.

**The release is not finished until production acceptance passes.**
