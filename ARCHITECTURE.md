# Daraja platform architecture

## Architectural objective

Daraja is a modular marketplace SaaS built around a shared identity and work
platform. Formal jobs and freelance work must share trust, identity, search,
payments readiness, notifications and AI infrastructure without collapsing into
one ambiguous data model.

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

## Domain modules

### Identity and access

Owns users, sessions, authentication providers, permissions and marketplace
capabilities. The current single `Role` enum is supported but should not be
expanded blindly. The target model must allow one person to participate as a
candidate, freelancer and/or client/employer where appropriate.

### Jobs and ingestion

Owns public vacancies, provenance, lifecycle, categories, search, source
adapters, scraper health and application destinations.

Rules:
- source identity must be idempotent;
- expired/closed vacancies are archived reversibly;
- no source adapter may create generic navigation/marketing pages as jobs;
- application URLs must be official and safely resolved;
- scraper failure in one source must not corrupt healthy sources.

### Candidate career

Owns candidate profiles, documents, saved jobs, Daraja-managed applications,
career preferences and alert configuration.

External-source applications remain external unless the employer has explicitly
chosen Daraja-managed applications.

### Employer ATS

Owns employer profiles, verification, employer vacancies, moderation, candidate
review and future team/analytics capabilities.

### Freelance marketplace

Future module boundary for freelancer profiles, services, packages, projects,
proposals, conversations, contracts, milestones, deliverables, reviews and
disputes. Do not overload the existing `Job` model to represent freelance
orders/contracts.

### Payments and billing

Owns subscriptions, payment attempts, provider references and future marketplace
order/contract payment state. Provider callbacks must be idempotent and
verifiable. Money must use integer minor units or a decimal-safe representation
for new transactional models; do not extend floating-point `amount` patterns to
marketplace accounting.

### Notifications

Owns email/WhatsApp alert delivery, retries, consent, deduplication and provider
status. Real messages require verified production provider configuration.

### AI and recommendations

Owns model-provider abstraction, prompt/version metadata, bounded inputs,
structured outputs, evaluation and human-review rules. Core business records
must remain valid when AI is disabled or unavailable.

### Trust and administration

Owns verification, moderation, audit logs, fraud/spam signals and future dispute
operations. Consequential administrative actions require authenticated actors
and durable audit evidence.

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

## API principles

- Public read APIs are cache-aware and return bounded data.
- Protected APIs derive user identity server-side; never trust caller-supplied
  `userId`, employer ownership or moderation authority.
- Writes validate controlled values and return clear errors.
- Provider webhooks verify signatures and support replay-safe idempotency.
- Application redirects must be allowlisted/bounded to trusted source domains.

## UI principles

- Mobile-first and keyboard accessible.
- Public discovery remains usable without authentication.
- Account walls appear only at personalised/protected actions.
- Forms show explicit validation, loading, success and error states.
- Responsive layouts must work at narrow phones, tablets and desktop widths.
- Paid placements must be visually distinct from organic results.

## Deployment principles

- Build outside cPanel where possible; install verified release artifacts.
- cPanel should run production and scheduled scraper processes, not compile large
  releases interactively unless emergency recovery requires it.
- Every production release needs health checks for homepage, jobs page, jobs API
  and release marker.
- A failed release should preserve or restore the previous working bundle.
- Database migrations are a separate operation from routine scraper execution.

## Observability

Minimum operational evidence:
- serving release SHA;
- public/API health;
- per-source scraper found/created/updated/archived counts;
- sanitised source errors;
- alert delivery outcomes;
- provider/payment webhook failures;
- structured audit events for privileged changes.

Never log credentials, access tokens, full sensitive profiles or raw provider
secrets.
