# Daraja platform architecture

## Architectural objective

Daraja is a modular marketplace SaaS built around a shared identity and work
platform. Formal jobs and freelance work must share trust, identity, search,
payments readiness, notifications and AI infrastructure without collapsing into
one ambiguous data model.

Security/privacy boundaries are architectural constraints. CVs, documents,
messages, employer data and future marketplace files must remain protected even
as web, iOS and Android clients expand.

## Current runtime topology

- **cPanel**: production Next.js application, Node 22 runtime, scraper execution,
  cron and operational logs.
- **Neon PostgreSQL**: production relational database accessed through Prisma.
- **GitHub**: canonical source, pull requests, tests and release history.
- **Vercel**: preview deployments and independent production-build validation.
- **External providers**: authentication, email, analytics, advertising,
  payments and WhatsApp integrations behind explicit configuration gates.

The production database remains on Neon unless a separately reviewed migration
is approved. Shared hosting is not the target database platform.

## Security layer

`SECURITY.md` defines the detailed security baseline. Architectural implications:

- authenticated identity is derived server-side;
- authorisation/ownership checks happen on every protected resource;
- private files use authenticated/signed access rather than permanent public
  URLs;
- secrets stay server-side;
- state-changing endpoints validate bounded inputs and abuse controls;
- privileged actions are auditable;
- AI receives only the data required for the requested task;
- payment providers own raw card/payment-credential handling;
- production releases and migrations are recoverable and reversible where
  practical.

## Domain modules

### Identity and access

Owns users, sessions, authentication providers, permissions and marketplace
capabilities. The current single `Role` enum is supported but should not be
expanded blindly. The target model must allow one person to participate as a
candidate, freelancer and/or client/employer where appropriate.

Sensitive identity/account operations require stronger protection than public
profile reads. Mobile clients must use the same server-side permission model.

### Jobs and ingestion

Owns public vacancies, provenance, lifecycle, categories, search, source
adapters, scraper health and application destinations.

Rules:
- source identity must be idempotent;
- expired/closed vacancies are archived reversibly;
- no source adapter may create generic navigation/marketing pages as jobs;
- application URLs must be official and safely resolved;
- scraper failure in one source must not corrupt healthy sources;
- remote fetch/application resolution must retain SSRF and redirect protections.

### Candidate career and CV

Owns candidate profiles, structured career facts, CV versions, private
documents, saved jobs, Daraja-managed applications, career preferences and
alert configuration.

The standard CV Builder is the candidate-approved source-of-truth workflow.
Structured facts include experience, education, skills, projects,
certifications, languages and other profile fields.

CV output should be versioned. A Master CV may produce role/industry/job-specific
variants without modifying source facts silently.

Generated CV/PDF files and uploaded documents are private by default. Target
storage uses opaque object identifiers plus authenticated routes or short-lived
signed URLs. The existing `CandidateDocument.url` field is transitional and must
not imply public access.

External-source applications remain external unless the employer has explicitly
chosen Daraja-managed applications.

### AI CV Builder

Owns AI-assisted transformations of candidate-approved facts, not the facts
themselves.

Permitted operations include rewriting, summary suggestions, ATS-gap hints,
job-specific tailoring and cover-letter drafting. Output is always previewed and
approved by the user before persistence.

AI cannot create authoritative employers, dates, qualifications, certificates,
achievements or skills that the candidate did not supply/approve.

### Employer ATS

Owns employer profiles, verification, employer vacancies, moderation, candidate
review and future team/analytics capabilities.

Employer access to candidate CVs/contact data must derive from a Daraja-managed
application, explicit candidate consent or a consented discoverable talent-pool
rule. An employer account alone never grants unrestricted candidate-data access.

### Freelance marketplace

Future module boundary for freelancer profiles, services, packages, projects,
proposals, conversations, contracts, milestones, deliverables, reviews and
disputes. Do not overload the existing `Job` model to represent freelance
orders/contracts.

Private conversations, proposals and deliverable files require resource-level
ownership/participant checks.

### Payments and billing

Owns subscriptions, payment attempts, provider references and future marketplace
order/contract payment state. Provider callbacks must be idempotent and
verifiable. Money must use integer minor units or a decimal-safe representation
for new transactional models; do not extend floating-point `amount` patterns to
marketplace accounting.

Daraja should minimise payment-card scope and never store raw card numbers/CVV.

### Notifications

Owns email/WhatsApp alert delivery, retries, consent, deduplication and provider
status. Real messages require verified production provider configuration.

Notification payloads must avoid unnecessary sensitive data, including future
mobile push notifications visible on lock screens.

### AI and recommendations

Owns model-provider abstraction, prompt/version metadata, bounded inputs,
structured outputs, evaluation and human-review rules. Core business records
must remain valid when AI is disabled or unavailable.

CV/job/message text is untrusted model input and may contain prompt-injection
instructions. AI tooling must isolate system policy, bound tools/data access and
validate outputs before use.

### Trust and administration

Owns verification, moderation, audit logs, fraud/spam signals and future dispute
operations. Consequential administrative actions require authenticated actors
and durable audit evidence.

Admin/high-privilege access should move toward mandatory MFA before marketplace
or payment scale.

## Data-design principles

- Keep source-of-truth entities explicit; do not use JSON as a substitute for
  important relational workflow state.
- Prefer additive migrations and backwards-compatible deploy sequences.
- Never delete production records merely to hide them from public views; use
  lifecycle/moderation state where possible.
- Use immutable external/provider identifiers for idempotency.
- Preserve `createdAt`/`updatedAt` and add explicit lifecycle timestamps when
  workflow history matters.
- New marketplace money models should include currency explicitly and avoid
  floating-point calculations.
- Sensitive candidate information must not become public by default.
- Separate structured candidate career facts from generated CV renderings and
  AI suggestions.
- Store private-file identifiers/metadata separately from public URLs.

## API principles

- Public read APIs are cache-aware and return bounded data.
- Protected APIs derive user identity server-side; never trust caller-supplied
  `userId`, employer ownership or moderation authority.
- Every protected resource checks ownership/capability, not only authentication.
- Writes validate controlled values and return clear errors.
- Provider webhooks verify signatures and support replay-safe idempotency.
- Application redirects must be allowlisted/bounded to trusted source domains.
- File downloads/uploads enforce authentication, allowed types, size and access
  rules.
- AI endpoints validate structured output and rate/cost boundaries.

## Web/mobile client principles

- Mobile-first and keyboard accessible on web.
- Public discovery remains usable without authentication.
- Account walls appear only at personalised/protected actions.
- Forms show explicit validation, loading, success and error states.
- Responsive layouts must work at narrow phones, tablets and desktop widths.
- Paid placements must be visually distinct from organic results.
- Future iOS/Android applications are clients of the same backend API/business
  rules rather than separate databases or duplicated authorisation logic.
- Mobile apps never embed private server/provider credentials.

## Deployment principles

- Build outside cPanel where possible; install verified release artifacts.
- cPanel should run production and scheduled scraper processes, not compile large
  releases interactively unless emergency recovery requires it.
- Every production release needs health checks for homepage, jobs page, jobs API
  and release marker.
- A failed release should preserve or restore the previous working bundle.
- Database migrations are a separate operation from routine scraper execution.
- Sensitive/schema changes require a reviewed migration plan and restore point.

## Observability

Minimum operational evidence:
- serving release SHA;
- public/API health;
- per-source scraper found/created/updated/archived counts;
- sanitised source errors;
- alert delivery outcomes;
- provider/payment webhook failures;
- structured audit events for privileged changes;
- security-relevant failures without leaking private payloads.

Never log credentials, access tokens, full sensitive profiles, CV contents, raw
private messages, identity evidence or raw provider secrets.
