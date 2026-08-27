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
than only in chat history. `AGENTS.md`, `PRODUCT.md`, `ARCHITECTURE.md`,
`ROADMAP.md`, `WORKSTREAMS.md`, `DECISIONS.md` and `PROGRESS.md` are the shared
coordination set.
