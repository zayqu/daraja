# Daraja delivery roadmap

This roadmap orders work by product dependency and production risk. Models may
work in parallel only when the workstreams do not create conflicting schema or
core-flow changes.

## Phase 0 - Production reliability

Goal: make the current jobs product boring and reliable.

Deliverables:
- cPanel Node runtime and release health remain stable;
- cPanel scraper runner and cron are observable and recoverable;
- Neon connectivity and jobs API health are monitored;
- closed vacancies reliably move out of Open and into Expired;
- application CTAs reach the final official apply/login destination;
- malformed source metadata is normalised;
- release marker and rollback path are reliable;
- secrets exposed during troubleshooting are rotated.

Exit gate: public jobs, detail pages, applications and scraper lifecycle work for
multiple consecutive production cycles without manual correction.

## Phase 1 - Candidate acquisition and career workspace

Goal: turn anonymous traffic into useful candidate accounts without blocking
public discovery.

Deliverables:
- responsive real job-alert form using the existing authenticated alert system;
- candidate profile completion and document management;
- saved jobs and application history;
- preferences for categories, locations and work arrangements;
- accessible email alert confirmations and unsubscribe controls;
- basic candidate dashboard and onboarding.

AI slice:
- natural-language vacancy search experiment;
- explainable match summary using only approved profile/job fields;
- CV/profile improvement suggestions behind explicit user action.

Exit gate: a candidate can discover -> sign in -> save preferences -> receive
controlled alerts -> apply/track where Daraja owns the application flow.

## Phase 2 - Employer ATS SaaS

Goal: make verified employers able to manage hiring on Daraja.

Deliverables:
- employer onboarding and verification;
- vacancy create/edit/pause/archive workflow;
- applicant inbox, status changes and notes;
- shortlist pipeline;
- candidate search only for consented/discoverable talent;
- employer team/permission design;
- hiring analytics and subscription feature boundaries.

AI slice:
- structured vacancy drafting;
- skill/screening-question suggestions;
- explainable candidate relevance assistance, never autonomous rejection.

Exit gate: a verified employer can publish and manage a hiring pipeline end to
end with auditable permissions.

## Phase 3 - Freelance marketplace foundation

Goal: support paid project/service work without overloading the Jobs model.

Deliverables:
- multi-capability identity design;
- freelancer profile, skills, portfolio and availability;
- service listings and Basic/Standard/Premium-style packages;
- client project briefs;
- freelancer proposals;
- messaging/conversation boundary;
- contract and milestone domain models;
- deliverable/revision/completion state;
- bilateral reviews and report flow.

AI slice:
- service-page drafting;
- project brief generation;
- proposal assistance;
- semantic matching between clients and freelancers.

Exit gate: marketplace flows are fully testable in sandbox mode without moving
real money.

## Phase 4 - Payments and marketplace transactions

Goal: enable safe regional monetisation through licensed providers.

Deliverables:
- provider abstraction;
- integer/decimal-safe money model with currency;
- TZS first, then regional currency support;
- mobile-money/card compatible checkout;
- verified idempotent webhooks;
- subscription billing lifecycle;
- freelance order/milestone payment states;
- refund/cancellation/dispute operational model;
- reconciliable provider references and audit logs.

Do not claim escrow or payment protection unless the legal/provider arrangement
actually supports it.

Exit gate: sandbox transactions, callbacks, retries and reconciliation pass
before any real-customer activation.

## Phase 5 - AI work engine

Goal: make AI a reusable platform capability instead of disconnected features.

Deliverables:
- provider-independent AI gateway;
- structured outputs and schema validation;
- prompt/version tracking;
- evaluation datasets for East African job/talent terminology;
- Swahili/English support evaluation;
- semantic search and matching;
- user-visible explanation/review controls;
- cost, latency and failure fallbacks;
- safety/privacy boundaries for candidate and employer data.

Exit gate: critical workflows remain functional with AI disabled, and AI quality
is measured rather than assumed.

## Phase 6 - Regional expansion and platform depth

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
- accessibility and responsive design;
- SEO/public discovery where appropriate;
- security and privacy review;
- source/provider observability;
- tests and production verification;
- documentation updates;
- no destructive production data operations without explicit review.
