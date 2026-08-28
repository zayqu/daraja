# Daraja multi-model operating guide

Daraja is an East African work marketplace SaaS. It is not only a job board.
The platform is intended to combine formal jobs, candidate career tooling and
CV building, employer hiring software, freelance services/projects, payments
readiness and AI-assisted matching while remaining mobile-first and safe for
production.

Security, privacy and trust are platform requirements. Models must not treat
security as a final hardening task after feature work.

## Read before changing code

Every model or contributor must read, in order:

1. `SECURITY.md` - security, privacy, CV/document and AI protection baseline.
2. `docs/JOB-SOURCE-POLICY.md` - authenticity, provenance, ingestion and lifecycle rules for jobs.
3. `PRODUCT.md` - product scope and user journeys.
4. `ARCHITECTURE.md` - technical boundaries and deployment model.
5. `ROADMAP.md` - delivery sequence and milestone gates.
6. `WORKSTREAMS.md` - ownership boundaries for parallel work.
7. `DECISIONS.md` - durable architectural/product decisions.
8. `PROGRESS.md` - chronological implementation and validation evidence.

When these documents disagree, use this precedence:
`DECISIONS.md` -> `SECURITY.md` -> `docs/JOB-SOURCE-POLICY.md` ->
`ARCHITECTURE.md` -> `PRODUCT.md` -> `ROADMAP.md` -> `PROGRESS.md`.

Update the conflicting document in the same pull request when appropriate.

## Core execution rules

- Work through focused branches and pull requests. One vertical outcome per PR.
- Do not invent product behavior when an existing flow or decision already exists.
- Preserve public job discovery without registration.
- External job ingestion must follow `docs/JOB-SOURCE-POLICY.md`; volume never
  overrides authenticity, provenance, source terms or current-open evidence.
- Require authentication for saved jobs, applications managed by Daraja,
  personalised alerts, candidate CV/documents, employer tools,
  freelancer/client tools, messaging and payments.
- Authentication is not enough: verify resource ownership/capability server-side
  for every protected read/write.
- Candidate CVs, documents, contact details and private career data are private
  by default.
- Prefer reversible, additive changes. Never delete production data as part of
  routine feature work.
- Never run destructive Prisma migrations, `db push`, reset, truncate or data
  deletion against production.
- Schema changes require an explicit migration review and a fresh restore point.
- Never send test email, WhatsApp or payment traffic to real users.
- Never expose credentials in logs, screenshots, PRs, docs or support tickets.
- Do not change DNS, billing, provider ownership, payment accounts or production
  credentials without explicit approval.
- AI may assist CV drafting, search, ranking, recommendations and quality work,
  but must not invent candidate facts or make irreversible employment,
  moderation, payment or dispute decisions by itself.
- Core workflows must remain functional when AI is disabled/unavailable.
- Future mobile clients must reuse the protected backend/API rather than moving
  authorisation/business rules into the app.

## CV Builder rules

- Structured candidate-approved career facts are the source of truth.
- Multiple CV versions may derive from the same approved facts.
- AI CV suggestions require preview and explicit user approval before saving.
- AI must not fabricate employers, dates, qualifications, certificates,
  achievements or skills.
- CV/document access must be private and permissioned; a stored URL is not proof
  that a file may be public.
- Employer access to CVs follows application/consent/talent-pool permissions.

## Definition of done

A change is not done because code exists. It is done only when:

- tests for the changed behavior pass;
- lint and production build pass when applicable;
- schema validation passes for database-touching work;
- the diff contains no unrelated changes;
- feature flags and fallbacks are safe;
- accessibility and mobile behavior are considered for UI changes;
- security/privacy implications are reviewed against `SECURITY.md`;
- ownership/authorisation checks are covered for protected data;
- logging/analytics do not leak sensitive data;
- job ingestion/source changes are checked against `docs/JOB-SOURCE-POLICY.md`;
- production deployment is verified for user-facing releases;
- `PROGRESS.md` is updated with meaningful completed evidence;
- a durable architectural decision is added to `DECISIONS.md` if the change
  alters platform boundaries or product direction.

## Parallel-model coordination

Before starting work, claim one workstream from `WORKSTREAMS.md` in the PR body
or branch description. Avoid editing the same core files as another active
workstream unless coordination is explicit.

Good parallel boundaries are:

- platform operations/security;
- candidate career, CV Builder and alerts;
- public jobs and ingestion;
- employer ATS;
- freelance marketplace;
- payments and contracts;
- AI/recommendation infrastructure;
- admin/trust/safety.

Security/privacy boundaries apply across every workstream; a feature owner may
not waive them independently.

Models should leave implementation notes in the PR, not in source comments that
will become stale. Use `PROGRESS.md` for shipped evidence and `DECISIONS.md` for
long-lived choices.

## Production topology

Current intended topology:

- cPanel: production Next.js runtime, scraper runner, cron and operational logs;
- Neon PostgreSQL: production database;
- GitHub: source control, review, tests and release source;
- Vercel: previews and independent build validation;
- external providers: authentication, email, analytics, ads, payments and
  WhatsApp only when explicitly configured and validated.

Do not move the production database into shared cPanel merely to colocate the
stack. That would be a separate high-risk migration requiring explicit review.
