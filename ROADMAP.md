# Daraja delivery roadmap

This roadmap orders work by product dependency and production risk. Models may
work in parallel only when the workstreams do not create conflicting schema or
core-flow changes.

## Phase 0 - Security, privacy and production protection

Goal: establish a dependable baseline before expanding into more sensitive
candidate, employer, freelance, payment or AI workflows.

Deliverables:
- rotate credentials exposed during troubleshooting;
- secure server-side authentication/session boundaries;
- verify ownership/authorisation on every protected API;
- document data classification and privacy boundaries;
- private-by-default candidate/document storage design;
- safe upload type/size/signature checks and malware-scanning plan;
- rate limits and abuse controls for authentication and write endpoints;
- audit logging for privileged/admin changes;
- secrets kept out of source, logs, analytics and client bundles;
- reliable Neon backups/restore-point process;
- cPanel runtime/release health and rollback remain stable;
- incident-response and recovery procedure documented;
- security headers, redirect safety and SSRF protections preserved.

Exit gate: a focused security review finds no known critical path where an
unauthorised user can access another user's private data, documents or
privileged actions, and production can recover from a failed release without
unsafe database operations.

## Phase 1 - Reliable jobs and candidate acquisition

Goal: make the existing public jobs product boring, useful and reliable while
keeping discovery open.

Deliverables:
- cPanel scraper runner and cron are observable and recoverable;
- Neon connectivity and jobs API health are monitored;
- closed vacancies reliably move out of Open and into Expired;
- application CTAs reach the final official apply/login destination;
- malformed source metadata is normalised;
- release marker and rollback path are reliable;
- responsive real job-alert form using the existing authenticated alert system;
- accessible confirmation, pause and unsubscribe controls.

Exit gate: public jobs, detail pages, applications, alerts and scraper lifecycle
work for multiple consecutive production cycles without manual correction.

## Phase 2 - Candidate career workspace and CV Builder

Goal: make Daraja a useful career product even before employer/freelance scale.

Deliverables:
- candidate onboarding and structured career profile;
- contact/profile details with privacy controls;
- work experience;
- education;
- skills;
- projects and portfolio links;
- certifications;
- languages;
- optional references;
- saved jobs and application history;
- preferences for categories, locations and work arrangements;
- standard CV Builder using candidate-approved structured facts;
- multiple CV versions (Master plus role/industry/job-specific versions);
- ATS-friendly layouts/templates;
- PDF export;
- private document/file management;
- authenticated/signed employer access only through allowed workflows;
- candidate data export/deletion support appropriate to platform policy.

AI CV Builder slice:
- rewrite candidate-provided text for clarity;
- strengthen experience bullet wording without changing facts;
- suggest summaries/objectives;
- identify likely ATS gaps;
- suggest skills only when supported by candidate-provided evidence;
- tailor a CV version to a selected vacancy;
- cover-letter drafting from approved facts;
- preview and explicit approval before any generated change is saved.

AI may never invent employers, dates, qualifications, certificates,
achievements or skills.

Exit gate: a candidate can create a structured career identity, build/export a
CV, safely create an AI-assisted tailored CV version, discover jobs, save/alert
and apply/track where Daraja owns the application flow.

## Phase 3 - Employer ATS SaaS

Goal: make verified employers able to manage hiring on Daraja without exposing
candidate data beyond permitted workflows.

Deliverables:
- employer onboarding and verification;
- vacancy create/edit/pause/archive workflow;
- applicant inbox, status changes and notes;
- shortlist pipeline;
- employer access to candidate CVs only through candidate consent/application
  or an explicitly consented talent pool;
- candidate search only for discoverable talent;
- employer team/permission design;
- hiring analytics and subscription feature boundaries;
- durable audit records for verification/moderation/privileged actions.

AI slice:
- structured vacancy drafting;
- skill/screening-question suggestions;
- explainable candidate relevance assistance, never autonomous rejection.

Exit gate: a verified employer can publish and manage a hiring pipeline end to
end with auditable permissions and no unrestricted access to private candidate
records.

## Phase 4 - Freelance marketplace foundation

Goal: support paid project/service work without overloading the Jobs model.

Deliverables:
- multi-capability identity design;
- freelancer profile, skills, portfolio and availability;
- service listings and Basic/Standard/Premium-style packages;
- client project briefs;
- freelancer proposals;
- private messaging/conversation boundary;
- contract and milestone domain models;
- deliverable/revision/completion state;
- private project/deliverable file handling;
- bilateral reviews and report flow;
- spam/scam/impersonation controls.

AI slice:
- service-page drafting;
- project brief generation;
- proposal assistance;
- semantic matching between clients and freelancers.

Exit gate: marketplace flows are fully testable in sandbox mode without moving
real money, and private messages/files cannot be accessed across accounts.

## Phase 5 - Payments and marketplace transactions

Goal: enable safe regional monetisation through licensed providers.

Deliverables:
- provider abstraction;
- integer/decimal-safe money model with currency;
- TZS first, then regional currency support;
- mobile-money/card compatible checkout;
- hosted/tokenised flows that minimise card-data scope;
- verified idempotent webhooks;
- subscription billing lifecycle;
- freelance order/milestone payment states;
- refund/cancellation/dispute operational model;
- reconciliable provider references and audit logs.

Do not claim escrow or payment protection unless the legal/provider arrangement
actually supports it.

Exit gate: sandbox transactions, callbacks, retries and reconciliation pass
before any real-customer activation.

## Phase 6 - AI work engine

Goal: make AI a reusable platform capability instead of disconnected features.

The CV Builder AI slice should already exist by this phase. This phase expands
AI across the rest of Daraja.

Deliverables:
- provider-independent AI gateway;
- structured outputs and schema validation;
- prompt/version tracking;
- evaluation datasets for East African job/talent terminology;
- Swahili/English support evaluation;
- semantic search and matching;
- user-visible explanation/review controls;
- cost, latency and failure fallbacks;
- data minimisation and provider privacy controls;
- prompt-injection resistance for CVs, job descriptions and messages;
- no consequential action directly authorised by model output.

Exit gate: critical workflows remain functional with AI disabled, and AI quality
is measured rather than assumed.

## Phase 7 - Native mobile applications

Goal: ship iOS and Android as clients of the same protected Daraja backend/API.

Deliverables:
- stable mobile-oriented API contracts;
- secure session/token strategy with platform-secure storage;
- Jobs, CV/career profile, applications, alerts and messages in mobile UX;
- push notifications with privacy-safe payloads;
- no embedded private provider/server credentials;
- shared records across web, iOS and Android;
- App Store and Google Play compliance/readiness review.

Exit gate: mobile clients do not require duplicate business logic or duplicate
user data and can revoke sessions centrally.

## Phase 8 - Regional expansion and platform depth

Potential work after Tanzania product-market fit:
- Kenya, Uganda and Rwanda country/location taxonomies;
- regional employer verification;
- additional payment rails/currencies;
- assessments and verified skills;
- agencies and team freelancing;
- promoted listings/services with transparent labelling;
- premium employer sourcing and talent pools;
- career learning/coaching partnerships;
- regional analytics and labour-market insights.

## Always-on requirements

Every phase includes:
- security/privacy review against `SECURITY.md`;
- accessibility and responsive/mobile-first design;
- SEO/public discovery where appropriate;
- source/provider observability;
- tests and production verification;
- documentation updates;
- no destructive production data operations without explicit review;
- no sensitive user/provider data in logs, analytics or PR evidence.
