# Daraja job source policy

Status: active platform policy
Last reviewed: 2026-08-28

## Purpose

This policy defines when Daraja may discover, ingest, publish, update and expire
external job vacancies. It applies to scraper adapters, direct feeds, employer
imports and future regional sources.

## Core rule

Daraja optimises for **genuine and current**, not maximum raw volume.

A vacancy must not be publicly presented as verified/open merely because a parser
found text that looks like a job.

## Source precedence

When the same vacancy appears in multiple places, prefer:

1. verified Daraja employer posting;
2. official government/public-body source;
3. official employer API/feed/ATS;
4. official employer career page;
5. authorised verified recruitment agency;
6. secondary job board as discovery evidence only;
7. social/forwarded/unknown lead requiring review.

The highest-trust valid source becomes canonical. Lower-trust sightings may be
kept as provenance evidence but should not create duplicate public records.

## Automatic publication requirements

A source may auto-publish only when:

- the source is registered and enabled;
- the organisation/publisher relationship is verified;
- automated collection is permitted or otherwise approved for that source;
- the adapter passes health checks;
- required job fields are present;
- the role is a current vacancy, not an interview/placement/news notice;
- the application method is valid and safe;
- the deadline is not past;
- duplicate checks pass;
- authenticity/fraud rules do not raise a blocking signal.

Unknown sources default to review, not automatic publication.

Implementation: `scraper/lib/job-policy.js` owns this decision. A source
auto-publishes only when its catalog entry sets
`"publishPolicy": { "autoPublish": true }`; every other source's new vacancies
are stored as `PENDING_REVIEW` and appear in the admin review queue. Vacancies
asking candidates to pay (application, registration, medical, training or
similar fees, in English or Swahili) are stored as `REJECTED` with the matched
wording as the note. Vacancies whose only application channel is a messaging
app go to review. A scraper refresh never overwrites an administrator's
moderation decision.

The same vacancy from several sources (same position, employer and closing
day) is stored once. The more authoritative source under "Source precedence"
becomes canonical; a catalog entry may override its rank with
`publishPolicy.precedence`.

Recruiter-discovered vacancies are verified on the employer's own page.
`inspectEmployerPage` (scraper/lib/source-page.js) opens the employer
application link, rendering JavaScript-only applicant systems with a shared,
budgeted headless browser (`EMPLOYER_PAGE_RENDER_BUDGET`, default 20 pages per
run). The link must show the vacancy; if it does not, the vacancy is held for
review. A vacancy the employer page marks closed is not imported. Location,
employment type, experience and a missing deadline stated on the employer page
replace the recruiter's copy. Apply sends candidates to the deepest working
application destination on the employer's side: the employer's apply, login or
registration page when one opens, otherwise the employer vacancy page when that
page is itself where the application starts. Daraja never adds an
intermediate description step. Records managed automatically follow the latest
evidence (held, rejected or re-published) until an administrator decides.

## What Daraja must never auto-publish

- fake or unverifiable jobs;
- expired/closed roles;
- interview invitations or successful-candidate placement notices;
- generic company pages with no role;
- scholarships, tenders, admissions or unrelated announcements as jobs;
- resume/CV collection with no current position;
- affiliate or sales schemes disguised as employment;
- roles that require payment for receiving the job;
- impersonated employers;
- application links that resolve to unsafe or unrelated domains;
- content collected by bypassing login, CAPTCHA, paywall or other access control;
- a full third-party description when Daraja lacks a basis to republish it.

## Collection methods

Prefer, in order:

1. official API/feed;
2. documented public ATS API;
3. RSS/Atom/XML;
4. sitemap + JobPosting JSON-LD;
5. official HTML;
6. official PDF/text notice;
7. approved agency source;
8. discovery-only search/index source.

Search engines may be used only to **discover candidate official vacancy URLs**.
A search result is never sufficient publication evidence on its own. Daraja must
open the candidate page, confirm it is on an allowlisted official employer/ATS/
verified-agency host, verify Tanzania relevance, verify that applications are
still open, resolve a valid deadline where the source policy requires one, and
extract the candidate application destination before publishing.

Search-engine snippets, cached dates and copied descriptions must not be treated
as authoritative vacancy facts.

Do not use a headless browser when a stable structured source exists.

## Application links

For external jobs, Apply should lead to the final safe official
application/login destination where deterministically resolvable.

Allowed application destinations must be tied to:

- the employer's verified domain;
- an ATS linked to the employer;
- an authorised recruitment agency;
- an official government/public-service portal.

An external job description page is not an acceptable final Apply destination if
the actual application CTA can be resolved safely.

## Authenticity signals

Positive signals include:

- employer/government official domain;
- stable ATS posting ID/requisition ID;
- careers link from official organisation site;
- organisation appears in an applicable regulator/official registry;
- official posted/closing date;
- recognised application portal;
- source-specific anti-fraud/no-fee statement;
- consistent organisation/contact/location information.

Warning signals include:

- personal/free email for an established employer without explanation;
- applicant payment request;
- shortened/obfuscated application URL;
- unrelated application domain;
- vague employer identity;
- impossible salary/benefit claims;
- requests for sensitive banking/identity data before normal recruitment stage;
- copied role with changed contact/application destination;
- job text that primarily collects leads rather than hires for a real role.

Signals inform verification; no single weak signal should automatically condemn a
legitimate small employer.

## Lifecycle

Open means current evidence says applications are accepted.

Close/archive when:

- deadline passes;
- authoritative API/feed marks it closed;
- the official page says applications are no longer accepted;
- employer closes it;
- canonical page is stably removed/closed;
- it disappears from a healthy authoritative snapshot.

For search-discovered vacancies, stale search visibility does not override these
closure signals. If Google or another search engine still indexes an expired page,
Daraja must reject/archive the vacancy rather than keep it open.

Do not archive on a failed source run. A network/parser error is not evidence that
all jobs closed.

Expired jobs may remain visible as historical records but must not appear under
Open or emit active `JobPosting` structured data.

## Content and attribution

Daraja must preserve:

- canonical publisher/source;
- employer identity;
- source URL;
- application URL;
- source/requisition identifier where available;
- posted/deadline facts where supplied;
- last verification time.

Do not silently invent missing salary, deadline, location, qualifications or
application instructions.

AI may classify or summarise approved source content, but generated text must not
be represented as employer-supplied fact. Where republishing full descriptions is
not permitted/approved, publish factual metadata and a bounded original summary
or excerpt as legally appropriate, then link to the authoritative source.

## Public trust UX

External listings should make provenance obvious. Recommended elements:

- source label;
- official/verified badge only when earned;
- `Last checked` timestamp;
- external Apply notice;
- deadline/open status;
- no-fee scam warning;
- report/correction control.

Recommended disclaimer:

> Daraja indexes vacancies from employers, public bodies and verified recruitment
> sources. Unless explicitly marked as a Daraja-managed vacancy, Daraja is not the
> hiring employer. The official employer/source controls application requirements
> and hiring decisions. Verify important details at the official source before
> submitting personal information. Never pay someone for a job offer. Report
> suspicious or inaccurate listings to Daraja.

## Source onboarding record

Before enabling automation, record:

- publisher/organisation;
- canonical website;
- careers/feed endpoint;
- source type;
- trust tier;
- terms/permission review status;
- crawl/robots status;
- application-domain allowlist;
- polling interval/rate limit;
- expected healthy job-count range;
- authoritative-snapshot behaviour;
- owner/contact/takedown path;
- adapter and tests.

## Human review boundary

The 99% automation target still requires a small exception queue. Human review is
mandatory for:

- unknown publisher;
- suspected scam/impersonation;
- legal/terms uncertainty;
- employer dispute or takedown;
- unsafe application destination;
- ambiguous duplicate merge;
- source parser change that materially changes extracted meaning.

## Regional rule

The same policy applies when Daraja expands to Kenya, Uganda, Rwanda and other
markets. Country-specific registries, recruitment law, terminology and publisher
relationships must be added; Tanzania assumptions must not be silently reused.


## Stored source, application and media contract

For every imported external vacancy, Daraja keeps provenance and candidate action
separate:

- `sourceUrl` is the canonical job advertisement/detail page used for
  verification, attribution and future refreshes.
- `applicationUrl` is the final verified candidate destination when one can be
  determined from the source: form, ATS, login/register flow, official portal or
  `mailto:` application.
- `companyLogo` is an official organisation logo when the source exposes one.
- `representativeImage` is a relevant official/source image used only when a
  reliable logo is unavailable.

The source URL must never be overwritten with an application URL. The public
Apply action prefers `applicationUrl`; legacy rows without that field continue
through the bounded server-side resolver until the authoritative source refresh
repairs them.

Media collection follows this order: official organisation logo, official
organisation/job image, representative source-page image, then Daraja's neutral
placeholder. Do not substitute unrelated stock imagery for employer branding.

## Recruitment-agency discovery rule

Recruitment agencies may be used to discover genuine vacancies, but Daraja must
not republish the agency as though it were the hiring employer or route users
through a competitor by default.

For agency-discovered vacancies:

- a named hiring company/institution is required;
- the displayed title must be the actual position, not an editorial roundup
  such as "10 new jobs at...";
- Tanzania relevance must come from the vacancy's explicit location field,
  not generic page/footer text;
- the application destination must be the hiring employer's stated email,
  careers page, ATS/application page, or another application channel explicitly
  named in the vacancy;
- a recruiter-only Apply button is not sufficient when the employer's direct
  application channel cannot be verified;
- recruiter branding/media must not be reused as the hiring company's logo;
- recruiter/source branding is retained internally for audit/provenance, not
  promoted in the public job overview.

If these conditions cannot be verified, Daraja rejects the vacancy rather than
publishing an incomplete or promotional listing.

