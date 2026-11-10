# Ajira: verified-source, deadline-only publication (staged)

## Editorial contract

Only auto-publish a vacancy if the adapter has independently opened a vacancy-level
original source and confirmed all of the following: specific position, identifiable
hiring organization, substantive role description, future explicit closing date,
and a valid original application destination.

Discovery feeds, third-party boards, Google results and email addresses are **leads**,
not employer verification. No deadline inference from posting date; no invented
qualifications, salary, openings or responsibilities.

Eligible jobs use one publication order: Job position, Hiring organization,
Job location (if specified), Employment type (if specified), Number of positions
(if confirmed), Job overview, Job description, Responsibilities, Qualifications,
Experience (only when supplied), Application deadline, and optional
Application requirements. Sections for unavailable facts are omitted rather
than invented. The original source is preserved separately as the verified
source URL, and the existing Apply button owns the application action. Do not
repeat either URL inside the editorial description or add another mobile
sticky Apply control over the bottom navigation.
The verified employer's source facts are selected and attributed within that
consistent Ajira editorial layout. Every post retains role-specific content,
but this deterministic zero-cost formatter is **not** a full semantic paraphrase
or a promise of copyright-distinct text.
A fuller human-edited rewrite remains the preferred method for substantial
job descriptions. Readers should always be directed to the original notice.

## Adapter coverage and limitations

- CRDB: reads a detail record from the official careers API; marks original data verified.
- NMB: parses the official careers page and an explicit closing date.
- Standard Bank: marks official ATS details verified, but holds vacancies where
  the official API does not supply a valid deadline.
- Ajira Portal: listing rows are leads. Candidate URLs with the official
  /view-advert/ path are now checked through a shared client-side browser
  renderer; the extracted title, hiring institution and closing date must
  match the listing, with substantive duties and qualifications. An HTML-only
  fetch returns a JavaScript shell and must **not** count as verification.
  Rows lacking a vacancy-specific original link, failed rendered pages and
  contradictory details remain pending review. Full live-rendered coverage
  and source-to-detail link discovery are not yet verified.
- AjiraWeb: employer/ATS structured postings are candidates for verification;
  email-only articles from the aggregator are not automatically verified.
- Verified agencies: only employer-page-confirmed duties and deadlines can
  substantiate auto-publication. Prefer the employer link as source of record.
- ReliefWeb: an aggregator page alone does not constitute original verification.

## Safe deployment plan (requires separate authorization)

1. Audit existing published records for missing deadlines, generic descriptions
   and original-source verification; export affected IDs before changing statuses.
2. Implement and test government vacancy detail retrieval; audit ATS/third-party
   employer ownership and verify original deadlines where possible.
3. Run all source adapters in dry-run using the strict gate, measure held/rejected
   counts and compare application links with official postings.
4. Review samples from each source, including English and Swahili vacancies;
   explicitly approve the editorial format and resulting supply reduction.
5. Enable on production with a reversible status-only cleanup of legacy invalid
   listings, keeping admin edits and genuine verified jobs intact.
6. Confirm resulting public listings, health reports, alerts, deduplication,
   deadline expiry and source attribution.

Current staging changes do **not** automatically clean legacy database rows
that are not refreshed by a source, and they must not be deployed as a silent
bulk-purge mechanism.

## Unique content standard

Reordering paragraphs and adding identical boilerplate does not create genuine
unique editorial content. Human editing or a separately approved, tested
rewriting engine is required for *complete* original-language paraphrasing.
Never hallucinate pay, qualifications, responsibilities, application documents,
contact names or deadlines. Preserve exact official role names, institutions and
application destinations. A short attributed source excerpt may be included
when it conveys a necessary original requirement; check source terms and review
against the original notice before publication.

## Public visibility consistency

The draft restricts open, expired and all public results to records with
explicit closing dates. Only active published records with future closing
dates appear in Open jobs, job detail reads, application redirects and alert
selection. Closed links continue to show a closed-job notice instead of a
missing page when the historical record can be found.

## Verification checks performed

- 79 targeted tests passed for source verification, publishing, public deadline
  filters and application behavior (10 November 2026).
- Browser-rendered official notice parsing has fixture-based tests; the server
  did not have Chromium installed for a complete live-source replay.
- A real plain HTTP request to an official PSRS vacancy URL returned a
  client-rendered shell without vacancy details. The new browser path is the
  correct mechanism, but requires a live GitHub-runner dry run.
- The zero-budget formatter currently cannot guarantee a faithful, original
  full paraphrase of long employer descriptions. Highly overlapping drafts
  are held for editing rather than auto-published.

## Additional staged hardening (10 November 2026)

- Government listing rows may expose an official numeric vacancy identifier.
  When present, the adapter builds the official /view-advert/ URL and still
  requires original-page verification before publication. Non-numeric IDs and
  generic index links never count as verified evidence.
- The original notice parser recognizes tested English and Kiswahili headings
  for duties, qualifications and the application period; contradictory source
  details are refused instead of guessed.
- Concurrent rendered detail checks share one browser launch, reducing process
  pressure on constrained hosting and respecting a fixed render budget.
- The admin's single and bulk Publish actions now reject missing or expired
  deadlines. Incomplete posts can still be saved in Needs review; the public
  page, application endpoint and alert selection also enforce valid deadlines.
- 125 related regression tests passed in the isolated worktree. No live
  Chromium validation or production deployment was performed.

## Live PSRS browser audit outcome — 10 November 2026

A dedicated GitHub-hosted Chromium workflow (no DATABASE_URL, no writes)
confirmed that the public vacancies table can populate 10 rows. A sampled
public row contained a real title (Assistant Meteorological Officer II),
Tanzania Meteorological Authority as institution, and an explicit closing
date of 23 November 2026.

However, each of the 10 rows exposed only a generic /vacancies source URL,
not a vacancy-level /view-advert/ link or recognized numeric vacancy ID.
The row had an ordinary "Login to Apply" button; clicking the title cell did
not navigate or open a detail dialog. Public response diagnostics for the
portal hostname did not reveal a vacancy-detail endpoint on this page load.
This does **not** establish that no official API exists elsewhere.

Read-only audit run: https://github.com/zayqu/daraja/actions/runs/42822435634

**Operational decision:** Keep current PSRS listing-table records as leads
requiring verification. Never infer a detailed role description from a listing
title, or treat the sign-in button as an original vacancy notice. Find a
public official vacancy-detail route, published notice/PDF, or a documented
original vacancy API before allowing PSRS automatic publication. Do not
guess vacancy IDs from titles or scrape authenticated sessions.

The standalone audit CI intentionally returns a failing status when it cannot
verify source details; this is a monitoring signal, not a production incident.
The main live scheduler is unchanged. The editorial gate additionally holds
all machine-formatted drafts for an independent factual and originality
review until an approved reliable rewrite workflow exists.

## New verified discovery route — official PSRS document archive

On 10 November 2026, a read-only GitHub Chromium audit confirmed that
https://www.ajira.go.tz/archive?type=vacancies exposes individual Download
actions under /api/v1/vacancies/attachment/token/<UUID>/download. Examples
include separate Nanyumbu, Moshi, Momba and Kisarawe council notices.
A direct read-only HTTP probe of the Nanyumbu URL returned status 200,
Content-Type application/pdf, a %PDF-1.7 signature and 274383 bytes.
This establishes that the link is a real **official document**, not that
any specific role, closing date or qualification in that document has
yet been extracted and matched.

The new scraper/lib/psrs-archive.js helper recognizes only canonical HTTPS
document-token links on www.ajira.go.tz and marks all extracted archive
announcements PENDING_DOCUMENT_REVIEW. The read-only archive auditor reports
these links for follow-up. These candidates are intentionally **not** connected
to automatic publication.

Before a candidate becomes verified originalEvidence, extract PDF content
with a reliable PDF parser, inspect representative layouts (including
scanned notices), match the exact individual position and hiring institution,
and establish its official application deadline and method from the notice.
A document's posting date must never be substituted for a closing date.
One multi-position PDF can substantiate many separately verified positions,
but the role-to-document match must be validated individually.

The browser audit workflow is now **manual-only**, not triggered on every
feature-branch commit, to protect the strict zero-dollar tooling budget.
Source: https://github.com/zayqu/daraja/actions/runs/42826279155

## Role-level PSRS PDF extraction — verified Nanyumbu example

The draft includes `scraper/lib/psrs-notice.js`. It uses the free, pinned
`pdfjs-dist` library rather than invoking Ghostscript or external AI services.
Only strict HTTPS PDF attachment endpoints on the Secretariat's own site can
be read; downloads are capped at 6 MiB and 20 seconds, and extraction is
capped at 30 pages. Unreadable/scanned documents, missing or conflicting
closing dates, incomplete position sections and nonmatching institutions
are **held for manual review**. No PDF-derived role is automatically published.

A real read-only PDF parse was performed using the PSRS Nanyumbu notice:
https://www.ajira.go.tz/api/v1/vacancies/attachment/token/0e70f879-9766-46cd-b60d-e006a2bf0dbc/download

The four-page PDF, dated **6 November 2026**, contains two separate
positions: MWANDISHI MWENDESHA OFISI DARAJA LA II (**4 posts**) and
DEREVA DARAJA LA II (**3 posts**). Its general terms explicitly state that
applications close on **19 November 2026** and should be submitted at
https://portal.ajira.go.tz/. The parser extracted separate role requirements,
matched the hiring institution (Halmashauri ya Wilaya ya Nanyumbu) against
the document and identified the correct shared deadline without confusing
the notice's publication date with the closing date.

For repeatable, read-only review after dependencies are installed:

```sh
node scripts/audit-psrs-notice-readonly.js \
  --url="https://www.ajira.go.tz/api/v1/vacancies/attachment/token/0e70f879-9766-46cd-b60d-e006a2bf0dbc/download" \
  --organization="Halmashauri ya Wilaya ya Nanyumbu"
```

The CLI emits **only** source metadata, position titles, counts, deadline,
and verification/review flags. It does not print full extracted employer
text, create vacancies, update the database, send notifications or publish
posts. Any subsequent editorial rewrite must preserve exact employer
requirements and remain subject to human factual/originality approval.
A validated PDF is a **source of facts**, not evidence that an editor has
approved a publishable vacancy. The original PDF remains the source link,
while the official portal remains the application destination.

This branch deliberately does not connect the new archive PDF pipeline to
automatic production ingestion until source matching, editorial approval and
legacy-deadline impacts have been separately reviewed and authorized.
