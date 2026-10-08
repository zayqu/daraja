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

## D-023 - Account deletion means erasure, not deactivation

**Status:** accepted

A signed-in user may permanently delete their Daraja account without contacting
support. The canonical erasure workflow removes authentication/session material,
private account profiles, alerts, saved jobs, Daraja-managed candidate
applications and eligible private candidate files. It must never be implemented
as an `active=false` flag while retaining the same personal account data.

Public employer vacancy records may remain because they are public business
records, but account ownership and moderator/submission pointers must be removed.
Legacy payment/subscription history and security/audit evidence may remain only
as the minimum operational record with the active Daraja account identifier
replaced by an opaque deletion reference. Name, email, authentication material
and an active account lookup must not be retained for that purpose.

A sole administrator must first establish another administrator before deleting
the last admin account. Future schema additions containing user-owned or private
data are incomplete until the account-erasure owner explicitly handles them.
Private-file erasure must participate in failure/rollback handling rather than
silently leaving an accessible document behind.


## D-024 - Licensed templates inform flow, not Daraja ownership

**Status:** accepted

Licensed interface templates may be used as references for information
hierarchy, interaction patterns, responsive composition and workflow depth.

They do not replace Daraja's product or technical ownership. Daraja keeps its
own brand, typography, colours, copy, routes, Next.js architecture, APIs,
security/privacy boundaries and business logic.

Do not import a template framework, routing stack, design system, demo data,
stock imagery or branding wholesale merely to make Daraja look like the
reference. Adapt the useful pattern into the existing implementation and remove
obsolete Daraja UI in the same change when a clean replacement is made.

The current Jobtex package is therefore a licensed layout/UX reference, not a
second frontend or a new application stack.


## D-025 - Daraja uses one canonical application typeface

**Status:** accepted, updated 2 October 2026

Daraja UI work must preserve one shared application-wide typeface rather than
allowing individual pages or licensed references to introduce their own fonts.

The canonical Daraja web typeface is **Poppins**, loaded once through
`next/font/google` in the root layout and exposed through the shared
`--font-daraja` design token.

All public, candidate, employer, admin and authentication surfaces inherit
Poppins through that token. Arial/Helvetica remain fallback fonts only.
Licensed templates may influence layout and interaction, but they must not
replace or override Daraja typography page by page.

This is a non-negotiable platform rule. New page/component CSS must inherit
`--font-daraja`; it must not introduce another UI font. The only intentional
exceptions are generated CV document typography chosen by the candidate and
HTML email markup that requires mail-client-safe fallback fonts.

Typography changes are incomplete until the shared Poppins regression test
passes and the live production release marker is verified to include the change.

This updates the earlier Geist baseline by explicit product-owner decision; the
centralized typography rule itself remains unchanged.


## D-026 - Daraja UI uses shared tokens and primitives

**Status:** accepted

Daraja's visual system is centralized before additional product surfaces are
added.

The single design-token source is `styles/tokens.css`. Typography, brand
colours, spacing, radii, elevation, layout widths and shared workspace values
must come from those tokens rather than being redefined page by page.

Repeated interface structure belongs in `components/ui/`. The initial shared
primitives are:

- `PageHero`
- `WorkspaceShell`
- `SurfaceCard`
- `WorkspaceTabs`

Candidate, employer, admin and authentication surfaces compose these primitives
instead of owning duplicate hero, shell, card and tab implementations.

Page-specific CSS remains appropriate only for genuinely page-specific layout
or workflow presentation. Refactors must preserve routes, permissions, forms,
privacy/security boundaries and business logic.


## D-027 - Mobile navigation uses a Daraja-owned floating bottom dock

**Status:** accepted

On mobile web surfaces, Daraja uses one shared floating bottom navigation dock
as the single primary navigation owner rather than duplicating the desktop
hamburger menu.

The dock is inspired by modern iOS navigation behaviour and the licensed Jobko
mobile reference, but it is implemented entirely inside Daraja using Poppins,
Daraja brand tokens, existing routes and the shared UI system.

The mobile bottom dock owns primary destinations only: Home, Jobs, Internships
and More. Candidate account controls do not live in the dock.

Notifications and Profile are icon-only actions in the mobile header at the
top-right: a bell icon for `/account/notifications` and a user icon for
`/account/profile`. The More sheet owns secondary public destinations,
candidate utilities such as Job Alerts/Privacy, WhatsApp and the feature-gated
employer entry point.

The shared dock also owns mobile navigation on admin, employer, post-job and
authentication routes, using the existing role-aware destination when the user
has a protected role. The mobile header may show the Daraja brand plus approved
context actions such as notification/profile icons, but it must not expose a
second hamburger/primary menu. Candidate/employer workspace tab bars are
desktop/tablet navigation and are hidden at phone widths so they do not compete
with the dock.

Template-only features such as messages or application tracking must not appear
until Daraja owns the corresponding backend/product capability.


## D-028 - Candidate profile and notification slots are real product surfaces

**Status:** accepted

The mobile dock reserves separate candidate destinations for Profile and
Notifications.

Profile uses the existing authenticated candidate profile API and private
`JobSeeker` record. It is not a decorative placeholder.

Notifications has its own authenticated account route and bell entry point, but
Daraja does not fabricate unread badges or fake notification items before a
persisted notification backend exists. The shared mobile dock accepts a future
`notificationCount` value and only renders a badge when the count is greater
than zero.

Email job alerts remain a separate preference surface under Job Alerts. They
must not be relabelled as in-app notifications.

Candidate career and employer feature flags remain centralized and continue to
control which product entry points are exposed.

## D-029 - Job cards show stated facts only

**Status:** accepted

Job card chips (experience, job type, openings, salary) come only from what the
source vacancy states. Ingestion never fills them with defaults, and the card
hides a chip whose value is missing. Category is used for discovery (filters,
alerts, detail page) rather than as a card chip, keeping the card to the facts a
candidate uses to decide whether to open a vacancy.

## D-030 - Scraped vacancies earn automatic publication per source

**Status:** accepted

Automatic publication is a per-source approval recorded in the source catalog
(`publishPolicy.autoPublish`), not a default. New or unproven sources publish
through human review. Vacancies that ask candidates to pay are blocked at
ingestion regardless of source. When several sources list the same vacancy,
one record is kept and the source-precedence order in
`docs/JOB-SOURCE-POLICY.md` decides which source is canonical. Automated
ingestion never overrides a moderation decision made by an administrator.


### Candidate account home

The user/profile icon opens `/account`, which is the canonical candidate account home. The page follows a compact profile-and-action-list pattern rather than a dashboard hero. Detailed profile editing stays at `/account/profile`, career tools stay under `/account/career`, and privacy/alerts/notifications keep their existing dedicated routes. The account hub must show only real account state and working destinations.

## D-031 - Daraja configuration is centralized; external destinations are discovered

**Status:** accepted

Daraja hardcodes product policy and security boundaries, not changeable source
destinations or duplicated public-site identity values.

Daraja-owned public settings such as the canonical site origin, shared channel
links and cookie scope have one environment-backed source of truth. Page,
component, metadata, sharing and notification code consume that shared
configuration instead of repeating literals.

External recruitment sources keep their stable entry points and allowlisted
hosts in the source registry/adapters. Application destinations are discovered
from the live official source, validated, followed through a bounded
Apply/Login/Register chain and stored as current source data. A path that merely
looks like an application path is not trusted without a working live response.

Runtime Apply handling may re-resolve a trusted stored destination when the
source controls that host. This lets source sites change login or application
routes without requiring a Daraja code release.

Internal Daraja routes, permissions, security checks, feature gates and product
workflow rules remain code-owned. "Dynamic" does not mean allowing remote sites
to control Daraja navigation, authorization or executable behaviour.

New work must modify the existing shared configuration or source registry rather
than adding page-specific constants, duplicate source URLs, duplicate channel
links or source-specific redirect patches.


## D-032 - Monetag runs alongside AdSense with non-pop-under formats only

**Status:** accepted

Ajira (`ajira.daraja.co.tz`, Monetag site 3521615) is monetized with Monetag in
addition to Google AdSense. Only AdSense-compatible formats are used: In-Page
Push and Vignette banner. Onclick/Popunder and MultiTag (which bundles Onclick)
must not be added, because AdSense does not allow Google ads on sites that
trigger pop-unders.

Monetag scripts load through `PrivacyControls` only after the visitor accepts
optional ads, the same as AdSense. Zone IDs live in `app/layout.js` with
`NEXT_PUBLIC_MONETAG_*` environment overrides. `public/sw.js` and the
`monetag` meta tag are required for site verification and must stay in place.

The CSP allows only the named Monetag domains (`nap5k.com`, `n6wxm.com`,
`3nbf4.com`) in `script-src`, `connect-src` and `frame-src`. If Monetag
changes domains and ads stop rendering, add the specific new domain rather
than opening the policy to all HTTPS origins.

## D-033 - Daraja learns new employer sources from discovery boards

**Status:** accepted

Secondary job boards (policy precedence 6) are read as discovery feeds, not as
publishers. `scraper/sources/discovery-feed.js` follows every lead to the
employer's own system. A lead becomes a published Daraja job only when that
system confirms it: an applicant-tracking system's public posting API
(SmartRecruiters, Greenhouse, Lever) or JobPosting structured data on the
employer page. Leads that cannot be confirmed are stored as `PENDING_REVIEW`
with the reason; leads already collected by an enabled source are skipped.

`scraper/lib/source-learning.js` owns applicant-system recognition (hosted
ATSs by host, self-hosted portals such as Frappe HR by URL shape), catalog
matching and the per-run learning report (`learning` in the scraper health
report and "Learned:" lines in the run log). The report lists employers seen
on discovery boards that Daraja does not yet collect, with the official
system each uses, so the next source to enable is evidence-led.

Self-hosted employer portals get one reusable adapter per platform
(`frappe-jobs` for Frappe HR); each employer is its own catalog source.
Learning never switches a source on by itself in this version: enabling a
source remains a reviewed catalog change. Persisting learned sources and
promoting them automatically after repeated clean runs is the next step.
