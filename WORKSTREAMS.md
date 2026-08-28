# Daraja parallel workstreams

This file defines safe ownership boundaries for multiple models working on the
same repository. It is a coordination tool, not a replacement for pull-request
review.

Every workstream must comply with `SECURITY.md`. Security/privacy boundaries
cannot be waived by an individual feature stream.

Every workstream also follows `docs/START-HERE.md`: inspect the current owner,
edit/refactor it cleanly, test, remove obsolete code, update progress, and leave
a durable handoff.

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

## Workstream B - Candidate career, CV Builder and alerts

Primary areas:
- candidate/account pages and APIs;
- `components/JobAlerts.js` and alert preference UI;
- saved jobs, candidate documents and applications;
- structured candidate career profile;
- CV Builder, CV versions and export;
- notification preference logic.

Responsibilities:
- responsive acquisition forms;
- authentication handoff;
- preferences and consent;
- career profile and application tracking;
- standard CV Builder using candidate-approved facts;
- ATS-friendly CV rendering/export;
- multiple CV versions;
- private candidate document access;
- AI CV suggestion/review UX in coordination with Workstream F;
- email alert UX.

Security requirements:
- candidate documents/CVs are private by default;
- verify ownership on every read/write;
- do not expose permanent public document URLs;
- AI changes require explicit user approval;
- do not allow AI to invent candidate career facts.

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
- candidate CV/contact access only through allowed application/consent rules;
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
- design for users with multiple capabilities;
- protect private messages, proposals and deliverable files.

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
- auditability;
- minimise card/payment-credential scope.

No real payment activation or billing-account changes without explicit approval.

## Workstream F - AI and recommendations

Primary future areas:
- AI CV assistance shared with Workstream B;
- AI provider gateway;
- semantic search/matching;
- prompt/output schemas;
- evaluations and explainability.

Responsibilities:
- AI remains optional to core flows;
- no autonomous consequential decisions;
- bounded/minimised approved inputs;
- structured, validated outputs;
- prompt-injection resistance for CV/job/message content;
- AI CV output cannot create unsupported career facts;
- East African/Swahili quality evaluation.

Avoid embedding provider-specific calls directly throughout product components.

## Workstream G - Platform operations and security

Primary areas:
- `SECURITY.md` baseline and cross-cutting controls;
- authentication/session hardening;
- protected API patterns and rate limiting;
- private upload/storage architecture;
- cPanel deploy/scraper scripts;
- GitHub workflows;
- release health;
- security headers, monitoring and dependency maintenance.

Responsibilities:
- production reliability;
- verified artifact deployment;
- cron/scraper observability;
- secret hygiene and rotation;
- authorisation/ownership security patterns;
- upload/file protection and malware-scanning integration design;
- backup/restore and incident-response readiness;
- rollback/recovery documentation.

Never fix operational incidents by weakening database, authentication,
authorisation, file privacy or provider safety.

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
- human review for consequential decisions;
- plan stronger admin authentication/MFA before marketplace/payment scale.

## Implementation ownership rule

Before changing a behavior, the workstream owner must identify the file/module
that currently owns it. Prefer editing or cleanly refactoring that owner over
adding a parallel path.

Do not leave two implementations of the same business rule after a normal PR.
If a staged migration temporarily requires both, the PR must identify which is
canonical, why compatibility is required and the exact removal condition for the
old path.

A handoff that says only "new version added" is incomplete. It must explain what
old behavior was replaced, what was removed, and where the new single owner now
lives.

## Collision rules

High-collision files include:
- `prisma/schema.prisma`
- authentication/session configuration;
- candidate document/storage abstractions;
- shared navigation/layout;
- global feature flags;
- common payment/AI abstractions.

Only one active PR should make substantial changes to a high-collision file at a
time unless the contributors explicitly coordinate.

Before opening a PR, state:
- workstream;
- user outcome;
- existing behavior owner inspected;
- files/modules owned;
- schema impact (`none`, `additive`, or `high-risk`);
- security/privacy impact;
- production/provider dependencies;
- tests and verification plan;
- whether any temporary compatibility path exists and its removal condition.

## Handoff format

When a model stops mid-work, leave a concise PR/issue note:

- **Done:** concrete completed behavior and the canonical owner now responsible.
- **Removed/Replaced:** obsolete implementation removed or intentionally retained with reason.
- **Pending:** next implementation step.
- **Evidence:** tests/build/preview/runtime results.
- **Risks:** schema, provider, security or production concerns.
- **Blocked by:** exact credential, decision, restore point or external action.

Do not leave handoff state only in chat history.
