# Daraja job source policy

Status: proposed platform policy
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
8. discovery-only secondary source.

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
- employer closes it;
- canonical page is stably removed/closed;
- it disappears from a healthy authoritative snapshot.

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
