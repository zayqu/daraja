# Daraja multi-model operating guide

Daraja is an East African work marketplace SaaS. It is not only a job board.
The platform is intended to combine formal jobs, candidate career tooling,
employer hiring software, freelance services/projects, payments readiness and
AI-assisted matching while remaining mobile-first and safe for production.

## Read before changing code

Every model or contributor must read, in order:

1. `PRODUCT.md` - product scope and user journeys.
2. `ARCHITECTURE.md` - technical boundaries and deployment model.
3. `ROADMAP.md` - delivery sequence and milestone gates.
4. `WORKSTREAMS.md` - ownership boundaries for parallel work.
5. `DECISIONS.md` - durable architectural/product decisions.
6. `PROGRESS.md` - chronological implementation and validation evidence.

When these documents disagree, use this precedence:
`DECISIONS.md` -> `ARCHITECTURE.md` -> `PRODUCT.md` -> `ROADMAP.md` -> `PROGRESS.md`.
Update the conflicting document in the same pull request when appropriate.

## Core execution rules

- Work through focused branches and pull requests. One vertical outcome per PR.
- Do not invent product behavior when an existing flow or decision already exists.
- Preserve public job discovery without registration.
- Require authentication for saved jobs, applications managed by Daraja,
  personalised alerts, employer tools, freelancer/client tools and payments.
- Prefer reversible, additive changes. Never delete production data as part of
  routine feature work.
- Never run destructive Prisma migrations, `db push`, reset, truncate or data
  deletion against production.
- Schema changes require an explicit migration review and a fresh restore point.
- Never send test email, WhatsApp or payment traffic to real users.
- Never expose credentials in logs, screenshots, PRs, docs or support tickets.
- Do not change DNS, billing, provider ownership, payment accounts or production
  credentials without explicit approval.
- AI may assist search, ranking, drafting and recommendations, but must not make
  irreversible employment, moderation, payment or dispute decisions by itself.

## Definition of done

A change is not done because code exists. It is done only when:

- tests for the changed behavior pass;
- lint and production build pass when applicable;
- schema validation passes for database-touching work;
- the diff contains no unrelated changes;
- feature flags and fallbacks are safe;
- accessibility and mobile behavior are considered for UI changes;
- production deployment is verified for user-facing releases;
- `PROGRESS.md` is updated with meaningful completed evidence;
- a durable architectural decision is added to `DECISIONS.md` if the change
  alters platform boundaries or product direction.

## Parallel-model coordination

Before starting work, claim one workstream from `WORKSTREAMS.md` in the PR body
or branch description. Avoid editing the same core files as another active
workstream unless coordination is explicit.

Good parallel boundaries are:

- public jobs and ingestion;
- candidate experience and alerts;
- employer ATS;
- freelance marketplace;
- payments and contracts;
- AI/recommendation infrastructure;
- platform operations/security;
- admin/trust/safety.

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
