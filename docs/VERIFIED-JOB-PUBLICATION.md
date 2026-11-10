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
