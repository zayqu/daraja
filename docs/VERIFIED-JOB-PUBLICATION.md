# Ajira: verified-source, deadline-only publication (staged)

## Editorial contract

Only auto-publish a vacancy if the adapter has independently opened a vacancy-level
original source and confirmed all of the following: specific position, identifiable
hiring organization, substantive role description, future explicit closing date,
and a valid original application destination.

Discovery feeds, third-party boards, Google results and email addresses are **leads**,
not employer verification. No deadline inference from posting date; no invented
qualifications, salary, openings or responsibilities.

Eligible jobs receive an original Ajira-formatted overview (employer, title, location,
job type when stated, openings when stated, closing date, application guidance)
and up to two short, attributed excerpts from the verified employer description.
This deterministic, zero-cost formatter is **not** a full semantic paraphrase.
A fuller human-edited rewrite remains the preferred method for substantial
job descriptions. Readers should always be directed to the original notice.

## Adapter coverage and limitations

- CRDB: reads a detail record from the official careers API; marks original data verified.
- NMB: parses the official careers page and an explicit closing date.
- Standard Bank: marks official ATS details verified, but holds vacancies where
  the official API does not supply a valid deadline.
- Ajira Portal: the current adapter reads listing rows only. These are held until
  vacancy-level official **descriptions** are extracted and verified. Do not
  mark generic placeholder text as a substantive description.
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
