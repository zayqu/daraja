# Owner vacancies

Jobs the Daraja owner posts directly. Each `.json` file in this folder is one
vacancy. When a change to this folder is merged into `master`, the
"Publish owner vacancies" GitHub workflow publishes it on ajira.daraja.co.tz
and prints the job's link in the workflow log.

To post a job: copy an existing file, give it a new lowercase-hyphenated name
(for example `2026-11-sales-officer-acme.json`) and fill in:

- `title`, `company`, `location`
- `category`: one of the categories in `lib/job-categories.js`
- `type`: `FULL_TIME`, `PART_TIME`, `CONTRACT`, `INTERNSHIP`, `FREELANCE`, or `null` if the advert does not say
- `deadline`: `YYYY-MM-DD` (closes at 23:59 Tanzania time)
- `applyEmail` (with optional `emailSubject`) or `applyUrl` (https only)
- `description`: list of lines. Use headings such as "About us", "Key responsibilities",
  "Requirements", "What we offer" and "How to apply"; start list items with "- "

Editing a file updates the same job. Never rename a published file: the name is
the job's identity. Never include fees charged to applicants.
