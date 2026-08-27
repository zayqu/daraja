# Daraja parallel workstreams

This file defines safe ownership boundaries for multiple models working on the
same repository. It is a coordination tool, not a replacement for pull-request
review.

## Workstream A - Public jobs and ingestion

Primary areas:
- `app/jobs/**`
- public jobs APIs
- `scraper/**`
- job categories, slugs and source/application resolution

Responsibilities:
- source correctness and idempotency;
- open/expired lifecycle;
- search/filter UX;
- final official application destinations;
- scraper health and cPanel runner integration.

Avoid editing candidate/employer protected flows unless required by a shared
contract.

## Workstream B - Candidate and alerts

Primary areas:
- candidate/account pages and APIs;
- `components/JobAlerts.js` and alert preference UI;
- saved jobs, candidate documents and applications;
- notification preference logic.

Responsibilities:
- responsive acquisition forms;
- authentication handoff;
- preferences and consent;
- career profile and application tracking;
- email alert UX.

Do not send real test notifications.

## Workstream C - Employer ATS

Primary areas:
- employer/admin employer-management pages and APIs;
- employer vacancy forms;
- application review/shortlist flows;
- verification/audit logic.

Responsibilities:
- verified employer identity;
- vacancy ownership;
- applicant workflow;
- future team/analytics boundaries.

## Workstream D - Freelance marketplace

Primary future areas:
- freelancer/client routes and APIs;
- service catalogue;
- projects/proposals;
- conversations;
- contracts/milestones/deliverables/reviews.

Responsibilities:
- keep freelance transactions distinct from public Job records;
- support service-first and project-first discovery;
- design for users with multiple capabilities.

Schema work in this stream must coordinate with Payments and Identity.

## Workstream E - Payments and billing

Primary areas:
- subscriptions;
- payment provider adapters;
- future marketplace order/milestone payment models;
- provider webhooks and reconciliation.

Responsibilities:
- idempotency;
- currency-safe money representation;
- provider verification;
- sandbox-first activation;
- auditability.

No real payment activation or billing-account changes without explicit approval.

## Workstream F - AI and recommendations

Primary future areas:
- AI provider gateway;
- semantic search/matching;
- prompt/output schemas;
- evaluations and explainability.

Responsibilities:
- AI remains optional to core flows;
- no autonomous consequential decisions;
- bounded approved inputs;
- structured, validated outputs;
- East African/Swahili quality evaluation.

Avoid embedding provider-specific calls directly throughout product components.

## Workstream G - Platform operations and security

Primary areas:
- cPanel deploy/scraper scripts;
- GitHub workflows;
- release health;
- headers, monitoring and dependency maintenance.

Responsibilities:
- production reliability;
- verified artifact deployment;
- cron/scraper observability;
- secret hygiene;
- rollback/recovery documentation.

Never fix operational incidents by weakening database or authentication safety.

## Workstream H - Admin, trust and safety

Primary areas:
- moderation;
- audit events;
- verification;
- abuse/reporting;
- future disputes and fraud signals.

Responsibilities:
- authenticated actor checks;
- explainable moderation state;
- durable audit evidence;
- human review for consequential decisions.

## Collision rules

High-collision files include:
- `prisma/schema.prisma`
- authentication/session configuration;
- shared navigation/layout;
- global feature flags;
- common payment/AI abstractions.

Only one active PR should make substantial changes to a high-collision file at a
time unless the contributors explicitly coordinate.

Before opening a PR, state:
- workstream;
- user outcome;
- files/modules owned;
- schema impact (`none`, `additive`, or `high-risk`);
- production/provider dependencies;
- tests and verification plan.

## Handoff format

When a model stops mid-work, leave a concise PR/issue note:

- **Done:** concrete completed behavior.
- **Pending:** next implementation step.
- **Evidence:** tests/build/preview/runtime results.
- **Risks:** schema, provider, security or production concerns.
- **Blocked by:** exact credential, decision, restore point or external action.

Do not leave handoff state only in chat history.
