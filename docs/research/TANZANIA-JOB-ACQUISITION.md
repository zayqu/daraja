# Tanzania job market and acquisition research

Status: research baseline, not legal advice
Last reviewed: 2026-08-28

## Objective

Daraja should aim for near-complete coverage of **publicly advertised, verifiable
Tanzania work opportunities**, while keeping ingestion, verification, lifecycle,
deduplication, classification, alerts and indexing approximately 99% automated.

The target is not literally every job that exists. Some vacancies are never
published publicly, appear only in closed groups, newspapers, WhatsApp or social
media, or are posted behind systems that do not permit automated collection.
Daraja should not weaken authenticity, privacy, copyright or platform terms in
order to claim 100% coverage.

The defensible product promise is:

> Daraja continuously discovers and verifies publicly advertised vacancies from
> official employers, public bodies and approved recruitment sources, and links
> candidates to the authoritative application destination.

## What the Tanzania vacancy market looks like

Tanzania is not served by one uniform job feed. Public vacancies are fragmented
across several publishing models.

### 1. Central public-service recruitment

The Public Service Recruitment Secretariat (PSRS) is a primary source for
ministries, independent departments, executive agencies, regional secretariats,
local government authorities and other public-service institutions.

Important ingestion distinction: the PSRS public site publishes multiple content
types next to each other, including:

- vacancy announcements;
- calls for interview;
- placement/called-to-work notices;
- other public-service notices.

Only genuine vacancy announcements belong in the Daraja Jobs catalogue. Calls
for interview and placement notices must never be misclassified as new jobs.

PSRS also uses bundled announcements/PDF-style notices where one publication may
contain multiple individual positions. Daraja should split one source notice into
individual job records only when the positions can be extracted deterministically
and mapped back to the same authoritative source notice.

Primary references:
- https://www.ajira.go.tz/
- https://portal.ajira.go.tz/

### 2. Local-government education and health recruitment

TAMISEMI operates recruitment/application systems for education and health roles,
including campaign-style or bulk recruitment. These flows may require NIDA,
profile completion and document upload.

Daraja should treat a TAMISEMI campaign as an official source and preserve any
eligibility restrictions rather than presenting every role as open to everyone.

Primary reference:
- https://ajira.tamisemi.go.tz/

### 3. Public institutions and universities

Universities and public institutions can appear through PSRS and/or their own
websites. The Tanzania Commission for Universities currently maintains an
official searchable register of recognised university institutions. That register
can seed Daraja's source-discovery list instead of relying on random web search.

Primary reference:
- https://tcu.go.tz/services/accreditation/universities-registered-tanzania

### 4. Banks and regulated financial institutions

Large private employers commonly publish through dedicated careers portals or
external applicant-tracking systems. NMB, for example, exposes a dedicated careers
portal with opening/closing dates and a final login-to-apply flow, and explicitly
states that it does not charge an application/recruitment fee.

The Bank of Tanzania maintains the official list of licensed banks and financial
institutions. Daraja can use that regulated employer universe to discover and
monitor each institution's official career source.

Primary references:
- https://www.bot.go.tz/BankSupervision/institutions?lang=en
- https://careers.nmbbank.co.tz/nmb_career/career.aspx/

### 5. Telecommunications, media and licensed operators

TCRA publishes a searchable list of licensed providers and certificates. This is
another useful authoritative employer universe for discovering career sources.

Primary reference:
- https://tcra.go.tz/services/licenses

### 6. NGOs and international organisations

The NGO sector is large and fragmented. Tanzania's NGOs Information System (NiS)
provides an official searchable register and currently contains thousands of
organisations, including national and international NGOs. This should be used to
verify organisation identity and seed source discovery.

Vacancies may be published on the NGO's own site, a global ATS, an international
organisation portal, a recruitment partner or a job board. Daraja should prefer
the organisation's own publication or authorised ATS whenever one exists.

Primary references:
- https://nis.jamii.go.tz/
- https://nis.jamii.go.tz/filter_ngo

### 7. Corporate ATS platforms

Many employers do not build their own recruitment software. Their official
career link resolves to platforms such as SmartRecruiters, Greenhouse, Lever,
Workday, Oracle/Taleo, SAP SuccessFactors or a local recruitment portal.

Where the ATS provides a documented public posting feed/API, Daraja should use
that instead of HTML scraping. Examples:

- SmartRecruiters Posting API;
- Greenhouse Job Board API;
- Lever Postings API.

These feeds expose published jobs and stable source identifiers, which improves
freshness, deduplication and closure detection.

References:
- https://developers.smartrecruiters.com/docs/posting-api
- https://docs.greenhouse.io/job-board.html
- https://github.com/lever/postings-api

### 8. Secondary job boards and aggregators

Tanzania has broad secondary boards such as JobwebTanzania and
GreatTanzaniaJobs. They are useful **discovery sensors**, because they surface
employers and vacancies Daraja may not yet know about.

They should not automatically become the canonical source of a vacancy when an
official employer source can be found. Daraja should use them to discover a lead,
then resolve the employer's official source/application destination.

Do not copy full third-party descriptions merely because a vacancy is public.
Source terms, copyright/licensing and robots/crawl restrictions must be reviewed
per source. A disclaimer does not create a licence to republish content.

### 9. Recruitment agencies

Tanzania recognises private employment promotion agencies under the National
Employment Promotion Services Act and associated regulations. Daraja should only
auto-publish agency-originated vacancies from an agency that can be identified
and verified, and should preserve the agency/employer relationship when known.

Because Daraja may evolve from indexing into placement/matching services, a
Tanzanian employment lawyer or Labour Commissioner should confirm whether and at
what stage Daraja itself requires registration as a Private Employment Promotion
Agency. A website disclaimer does not remove a statutory registration duty.

Primary reference:
- https://www.kazi.go.tz/documents/regulations

## East African pattern

The broader East African market follows the same fragmented model, so the
Tanzania architecture should be regional-ready rather than Tanzania-hardcoded.

Examples:

- Kenya Public Service Commission publishes structured active adverts with advert
  number, position, ministry, number of vacancies, experience, category, advert
  date and close date. It also distinguishes open adverts from roles restricted
  to serving officers.
- Rwanda uses the MIFOTRA Civil Service Recruitment Portal with structured job
  advertisements and account-based applications.
- Uganda's Ministry of Public Service provides an official Apply for Jobs entry
  point.
- Fuzu and BrighterMonday are important regional career platforms but should be
  treated as separate publishers/partners, not assumed to be the authoritative
  source for every employer.

References:
- https://www.psckjobs.go.ke/
- https://recruitment.mifotra.gov.rw/
- https://www.publicservice.go.ug/

## Opportunity taxonomy Daraja should support

Do not force every public notice into `FULL_TIME` or a generic Job record without
preserving the actual opportunity type.

Recommended public opportunity types:

- permanent/full-time employment;
- part-time employment;
- fixed-term/contract employment;
- temporary/casual/seasonal employment;
- internship;
- graduate/management trainee;
- apprenticeship/field placement;
- consultancy/individual contractor;
- volunteer role;
- remote employment;
- transfer/internal-public-service vacancy;
- freelance/project opportunity (future freelance domain, not normal Job model).

Explicitly exclude or separately classify:

- call-for-interview notices;
- placement/called-to-work notices;
- scholarships;
- admissions/training opportunities;
- procurement/tenders;
- grants;
- events/career fairs;
- generic employer pages with no open vacancy;
- CV collection where no current position exists;
- affiliate/business opportunities disguised as employment.

## Acquisition strategy

### Principle: API/feed first, scrape last

Use this source-method priority:

1. official employer/public-body API or authorised feed;
2. documented public ATS posting API;
3. RSS/Atom/XML feed;
4. canonical job sitemap plus `JobPosting` JSON-LD;
5. official HTML career page;
6. official PDF/notice with deterministic text extraction;
7. approved recruitment-agency feed/page;
8. secondary job board as discovery only;
9. social-media/WhatsApp/newspaper lead requiring verification.

Headless-browser scraping should be a fallback, not the default. It is slower,
more fragile and more likely to break when pages change.

### Employer universe before vacancy crawling

Near-complete coverage requires an employer/source registry, not an endless open
web crawler.

Seed the registry from trusted universes such as:

- PSRS/public institutions;
- Bank of Tanzania licensed institutions;
- TCRA licensed providers;
- TCU recognised universities;
- NGO NiS registered organisations;
- major hospitals/health systems and professional bodies;
- mining/energy/logistics/manufacturing employer directories where authoritative
  registries exist;
- verified employers already posting directly to Daraja.

For each organisation, discover and record its canonical website and career
source. Re-run source discovery periodically so an employer that changes ATS is
not permanently lost.

## Source registry model

Every adapter should be driven by source metadata rather than hard-coded cron
logic scattered through the scraper.

Suggested source fields:

- source ID and human name;
- organisation ID;
- country;
- canonical organisation domain;
- careers URL;
- source type (`API`, `ATS_API`, `RSS`, `JSON_LD`, `HTML`, `PDF`, `AGENCY`,
  `DISCOVERY_ONLY`);
- adapter identifier/version;
- trust tier;
- terms/permission review state;
- robots/crawl policy state;
- poll interval;
- last attempted/successful run;
- last non-empty successful run;
- expected healthy result range;
- source-specific rate limit;
- authoritative snapshot boolean;
- application-domain allowlist;
- enabled/paused state;
- health/degradation reason.

## Trust tiers

### Tier A - authoritative structured source

Examples: PSRS/Ajira official systems, official employer API, public ATS feed,
verified Daraja employer posting.

Default: eligible for automatic publication after deterministic validation.

### Tier B - authoritative unstructured source

Official employer/public-body HTML or PDF without a structured feed.

Default: automatic publication when parser confidence and required fields pass;
otherwise review queue.

### Tier C - verified recruitment agency

Agency identity and relationship are verified, and publishing/republishing terms
are acceptable.

Default: automatic publication only within the agency's approved scope.

### Tier D - secondary aggregator/discovery source

Useful to discover a missing employer/vacancy but not canonical by default.

Default: do not republish automatically. Resolve to official source first.

### Tier E - unverified/social lead

Social media, forwarded email, WhatsApp, screenshot, anonymous source or unknown
website.

Default: never auto-publish. Require verification.

## Genuine-job verification rules

High-confidence automatic publication should require all applicable checks:

- source is registered and enabled;
- organisation identity is known;
- source domain/ATS relationship is verified;
- position title is specific and non-generic;
- description represents a real open role;
- application method exists;
- final apply URL/email belongs to the verified employer/ATS/agency relationship;
- deadline has not passed;
- source page/API still says the role is open;
- location and eligibility are plausible and preserved;
- no applicant payment is required for obtaining the job;
- no obvious impersonation, phishing, affiliate or data-harvesting pattern;
- the vacancy is not an interview/placement/scholarship/tender notice;
- duplicate/canonical source checks pass.

A corporate-domain email is a positive signal but not a mandatory requirement
when the organisation legitimately uses an ATS or authorised agency.

NMB's current careers portal explicitly warns that the bank does not charge a fee
in connection with application or recruitment. Daraja should generalise that
anti-scam principle across the marketplace.

## Canonicalisation and deduplication

The same vacancy may appear on:

- employer careers page;
- ATS host;
- recruitment agency;
- multiple job boards;
- social media;
- Daraja discovery.

Prefer the highest-trust authoritative source and keep secondary sightings as
provenance evidence rather than separate public jobs.

Deduplicate using, in order:

1. stable source/ATS posting ID;
2. employer requisition/reference number;
3. canonical application URL;
4. normalised employer + title + location + deadline;
5. bounded content fingerprint for ambiguous cases.

Never merge two genuinely different vacancies merely because titles match.

## Lifecycle automation

A job should be Open only while there is positive evidence that applications are
still accepted.

Close/archive automatically when any authoritative condition is met:

- deadline is in the past;
- API/ATS marks job closed/unpublished;
- canonical job URL returns a stable not-found/closed state;
- the job disappears from a healthy authoritative snapshot;
- employer explicitly closes it in Daraja.

Do **not** archive an entire source's inventory merely because that source had a
network/parser failure. Source failure and valid empty snapshot must be distinct.

Record:

- first discovered time;
- source posted time when available;
- last source modification time when available;
- last verified open time;
- closed/expired time;
- closure reason;
- source run that caused the transition.

## Automation target

The practical goal is 99% automated operations, not zero human governance.

Automate:

- polling and retries;
- ATS/source detection;
- extraction;
- deterministic field validation;
- source verification checks;
- normalisation;
- duplicate detection;
- controlled category mapping;
- open/expired lifecycle;
- source health alerts;
- sitemap/JobPosting structured data;
- candidate alerts;
- re-verification;
- reporting and metrics.

Keep human review for the exceptional 1%:

- new/unknown source onboarding;
- source terms or permission ambiguity;
- suspected fraud/impersonation;
- parser breakages that change meaning;
- employer complaints/corrections;
- ambiguous duplicate merges;
- legal/takedown requests.

AI may help classify ambiguous text and flag anomalies, but should not fabricate
job facts or turn a low-trust source into a verified vacancy by itself.

## Scheduling model

Avoid one monolithic scraper run. A scheduler should select due sources based on
source metadata.

Example starting cadence:

- official APIs/ATS feeds: every 15-60 minutes;
- high-volume official HTML sources: hourly;
- lower-volume official pages/PDF notices: every 1-3 hours;
- employer-source discovery: daily/weekly depending on source;
- secondary discovery sensors: several times per day where permitted;
- full source-health reconciliation: daily.

Use a per-source lock so overlapping cron runs cannot write the same source at
the same time. One failed source must not fail healthy sources.

## Job record fields to add over time

The current Daraja Job model covers the first jobs product, but near-complete
multi-source acquisition will eventually benefit from structured provenance.
Do not migrate production only because this research lists fields.

Future candidates include:

- `organisationId` / canonical employer relation;
- `sourceRecordId` relation;
- `sourcePostedAt`;
- `sourceUpdatedAt`;
- `lastVerifiedAt`;
- `closedAt` and `closedReason`;
- `requisitionId`;
- `canonicalSourceUrl`;
- `applicationUrl` distinct from the description/source URL;
- structured location (country/region/city/district);
- workplace arrangement (onsite/hybrid/remote);
- opportunity type;
- number of positions;
- structured salary range/currency/period when supplied;
- eligibility/restriction fields;
- provenance/trust status;
- content/fingerprint hash.

## Public job-page trust UI

Each imported job should eventually show:

- employer name;
- source/provenance;
- `Official source` or appropriate verification label only when earned;
- date posted when known;
- deadline;
- last checked/verified time;
- application method;
- external-application notice when leaving Daraja;
- no-fee/scam warning;
- Report suspicious listing action;
- Expired state when closed.

Suggested concise disclaimer:

> Daraja indexes vacancies from employers, public bodies and verified recruitment
> sources. Unless a listing is explicitly marked as a Daraja-managed vacancy,
> Daraja is not the hiring employer. Application requirements and decisions are
> controlled by the stated employer/source. Verify important details at the
> official source before submitting personal information. Never pay someone for
> a job offer. Report suspicious or inaccurate listings to Daraja.

The source-specific official notice prevails if a factual discrepancy exists.

## SEO and Google Jobs compatibility

Daraja should publish `JobPosting` structured data only for a single genuine open
job detail page. Google explicitly disallows fake/non-existent jobs, promotional
content disguised as jobs, expired jobs, jobs without a way to apply, and jobs
that require applicant payment.

When a job closes:

- set `validThrough` appropriately and/or remove active `JobPosting` markup;
- remove the job from the active jobs sitemap while preserving an Expired user
  page if Daraja chooses to preserve history;
- use Google's Indexing API for job-posting updates/removals where applicable;
- keep canonical URLs stable.

Reference:
- https://developers.google.com/search/docs/appearance/structured-data/job-posting

## Legal and source-policy gates

Before onboarding a new source for automated collection:

1. identify the legal/official publisher;
2. inspect source terms and published API/feed conditions;
3. inspect robots/crawl directives where applicable;
4. prefer a documented API/feed over scraping;
5. set a conservative rate limit;
6. decide what Daraja is permitted to store and republish;
7. preserve attribution and canonical source/application links;
8. record a takedown/contact path.

Do not assume that publicly visible text may be copied wholesale. A disclaimer
cannot cure copyright, contractual or access-control problems.

## Strategic conclusion

The path to broad, genuine coverage is not a bigger scraper. It is a **source
acquisition platform** composed of:

1. authoritative employer universe;
2. source registry;
3. API/ATS/feed adapters;
4. controlled HTML/PDF adapters;
5. discovery sensors;
6. authenticity and provenance engine;
7. canonical deduplication;
8. lifecycle reconciliation;
9. source-health observability;
10. employer direct-publishing/claiming;
11. small exception review queue.

As Daraja grows, verified employers should be encouraged to connect a feed or
post directly. That reduces scraping dependence, improves freshness and creates
a stronger employer SaaS relationship.
