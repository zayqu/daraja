# Daraja durable decisions

This log records decisions that future models must preserve unless a later entry
explicitly supersedes them. Add short entries when a change alters product or
architecture boundaries.

## D-001 - Daraja is a work marketplace SaaS

**Status:** accepted

Daraja is not only a job board. The product combines formal jobs, candidate
career tooling, employer hiring SaaS, freelance services/projects, regional
payments readiness and AI-assisted work matching.

Tanzania is the first market; the design target is East Africa.

## D-002 - Public job discovery stays open

**Status:** accepted

Users do not need an account to browse/search jobs or open public vacancy detail
pages. Authentication is required only for personalised/protected actions such
as saved jobs, managed applications, alerts, employer tools and marketplace
transactions.

## D-003 - Closed jobs belong in Expired

**Status:** accepted

An inactive/closed or past-deadline vacancy must not appear in Open jobs. Source
removal from an authoritative snapshot may archive a vacancy reversibly rather
than deleting it.

## D-004 - Apply means apply

**Status:** accepted

For external vacancies, the Apply action should lead to the final safe official
application/login CTA where that target can be resolved. It should not knowingly
send the user to another generic employer/institution description page.

## D-005 - Freelance work gets its own domain model

**Status:** accepted

Do not convert the existing `Job` table into a catch-all marketplace object.
Freelance services, projects, proposals, contracts, milestones, deliverables and
reviews require explicit models/workflows.

Daraja should support both service-first catalogue buying and project-first
proposal/hiring journeys.

## D-006 - Multi-capability identity is the target

**Status:** accepted, future migration required

A person may be a candidate, freelancer and buyer/client at the same time. The
current single `User.role` implementation is transitional. Future identity work
should support multiple capabilities without duplicating accounts.

No immediate production schema migration is authorised by this decision alone.

## D-007 - AI is assistive, optional and reviewable

**Status:** accepted

AI may support natural-language search, matching, drafting, recommendations,
quality checks and moderation triage. Core workflows must work when AI is
disabled/unavailable.

AI must not autonomously reject candidates, suspend users, resolve disputes,
move money or make other consequential final decisions.

## D-008 - Production topology

**Status:** accepted

Use:
- cPanel for production Next.js runtime, scraper execution, cron and logs;
- Neon PostgreSQL for production data;
- GitHub for canonical source/review/testing;
- Vercel for preview and independent build validation.

Moving production PostgreSQL into shared cPanel is not part of routine platform
work and requires a separate migration decision.

## D-009 - Production data safety

**Status:** accepted

Routine work is additive/reversible. No destructive Prisma migration, database
reset, `db push`, truncation or production-data deletion is allowed without a
specific reviewed plan, fresh restore point and explicit approval.

## D-010 - Marketplace money must be accounting-safe

**Status:** accepted

Future order/contract/milestone money must not use floating-point arithmetic.
Use integer minor units or an appropriate decimal-safe database type with an
explicit currency. Existing legacy payment fields can be migrated separately.

Daraja must not claim regulated escrow/payment protection without an actual
licensed provider/legal structure.

## D-011 - Regional product requirements are first-class

**Status:** accepted

New systems should be designed for mobile-first East African usage, Swahili and
English readiness, regional location taxonomies, local employer trust patterns,
mobile-money compatibility and multiple regional currencies.

## D-012 - Multi-model collaboration is repository-driven

**Status:** accepted

Important project context must live in repository Markdown, PRs and tests rather
than only in chat history. `AGENTS.md`, `SECURITY.md`, `PRODUCT.md`,
`ARCHITECTURE.md`, `ROADMAP.md`, `WORKSTREAMS.md`, `DECISIONS.md` and
`PROGRESS.md` are the shared coordination set.

## D-013 - Security and privacy precede marketplace expansion

**Status:** accepted

Daraja handles sensitive career and identity data. Security, privacy, trust,
backup/recovery, secret management, file protection and authorisation are
platform prerequisites, not a final polish phase.

No freelance, messaging, payment or broad AI feature may bypass the boundaries
in `SECURITY.md` merely to ship faster.

## D-014 - CV Builder is a first-class candidate product

**Status:** accepted

Daraja must provide a structured CV Builder, not only a CV upload field.
Candidate-approved structured career facts are the source of truth. The product
should support multiple CV versions and ATS-friendly export.

CVs and supporting candidate documents are private by default. Storage/access
must evolve toward private object storage with authenticated or short-lived
signed access rather than permanent public URLs.

The current `CandidateDocument.url` field is transitional and does not grant
permission to expose candidate documents publicly.

## D-015 - AI CV Builder may improve wording but not invent facts

**Status:** accepted

The AI CV Builder may rewrite candidate-provided text, suggest summaries,
identify likely ATS gaps, tailor a CV to a vacancy and draft cover letters from
approved facts.

It must not invent employers, dates, qualifications, certificates,
achievements or skills. Generated changes are suggestions until the candidate
previews and explicitly approves them.

AI output must remain distinguishable from verified/candidate-supplied facts.

## D-016 - Web and future mobile apps share one backend source of truth

**Status:** accepted

Future iOS and Android applications are clients of the same protected Daraja
backend/API and database. They must not create parallel user/job/CV/payment
systems or embed private server/provider credentials.

A saved job, CV version, application, message or contract should represent the
same backend record regardless of web or mobile client.

## D-017 - Job coverage optimises for genuine and current, not raw volume

**Status:** accepted

Daraja's target is near-complete coverage of publicly advertised, verifiable
Tanzania vacancies. It must not claim literal coverage of every job that exists,
because some roles are private, closed-group, offline, behind restricted systems
or otherwise unavailable for lawful automated collection.

A smaller set of genuine current vacancies is preferable to a larger catalogue
containing stale, fake, duplicated or unverifiable records.

## D-018 - Job acquisition is source-registry driven and API/feed first

**Status:** accepted

The scraper should evolve into a source acquisition platform driven by a source
registry. Prefer official APIs, public ATS feeds, RSS/XML, job sitemaps and
`JobPosting` structured data before HTML/PDF scraping. Headless browser collection
is a fallback.

Authoritative employer universes should be seeded from official sources such as
PSRS/Ajira, Bank of Tanzania licensed institutions, TCRA licensed providers, TCU
recognised universities and the Tanzania NGO information system where useful.

No production schema migration is authorised by this decision alone.

## D-019 - Aggregators are discovery sensors unless explicitly approved

**Status:** accepted

Secondary job boards may reveal missing employers and vacancies, but they do not
become the canonical source by default. Daraja should resolve a discovered
vacancy to the employer, public body, ATS or verified recruitment agency whenever
possible.

Do not copy a third-party description wholesale merely because it is publicly
visible. Source terms, crawl restrictions, licensing/copyright and attribution
must be reviewed per source. A disclaimer is not permission to republish.

## D-020 - 99% automation includes an exception review queue

**Status:** accepted

Daraja should automate polling, extraction, validation, normalisation,
deduplication, category mapping, lifecycle, source health, indexing and candidate
alerts. Human review remains mandatory for the exceptional cases where publisher
identity, fraud, legal/terms status, unsafe application destinations, ambiguous
duplicates, takedowns or material parser changes cannot be resolved safely.

AI may assist anomaly detection and classification but cannot convert an
unverified source into a verified vacancy by itself.

`docs/JOB-SOURCE-POLICY.md` is the operational policy for these decisions.

## D-021 - Every implementation task starts from repository context

**Status:** accepted

Models and contributors must not begin implementation from prompt/chat memory
alone. Every task starts at `docs/START-HERE.md`, then reads the relevant project,
security, architecture, decision, progress and domain documentation before
inspecting the code that currently owns the behavior.

The mandatory work loop is:

**Read -> Understand -> Plan -> Edit existing implementation -> Test -> Clean up -> Update docs/progress -> Hand off.**

Handoff state must be durable enough that another model can continue without the
previous conversation.

## D-022 - Daraja uses modify-first, clean-replacement engineering

**Status:** accepted

The normal solution to an implementation problem is to correct or cleanly
refactor the code that already owns that responsibility. Do not accumulate
`V2`, `New*`, parallel routes, duplicate helpers/services, wrapper patches,
commented-out replacements or permanent fallback paths merely to avoid editing
existing code.

New files are appropriate only for genuinely new responsibilities or deliberate
module refactors. When an implementation is moved or replaced, obsolete code is
removed in the same change when safe so there remains one clear source of truth.

Temporary compatibility code is permitted only for a documented staged
migration or bounded production emergency and must have an explicit removal
condition.
