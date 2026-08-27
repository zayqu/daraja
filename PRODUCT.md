# Daraja product model

## Mission

Daraja connects people in East Africa to formal employment, freelance income
and verified organisations through one trusted work marketplace.

The initial market is Tanzania. The regional design target is Tanzania, Kenya,
Uganda and Rwanda, followed by wider East Africa.

Daraja is not only a job board. It is a work marketplace SaaS with candidate
career tools, employer hiring software, freelance services/projects, payments
readiness and AI assistance. Security, privacy and trust are platform features
that every product area depends on.

## Product priorities

The product order is deliberate:

1. Security, privacy, trust and production protection.
2. Candidate career identity, CV Builder and AI CV Builder.
3. Reliable public jobs, applications and personalised discovery.
4. Employer hiring SaaS and ATS.
5. Freelance services/projects and messaging.
6. Provider-backed payments and marketplace transactions.
7. Wider AI work engine capabilities.
8. Native iOS/Android applications and regional expansion after the web/API
   workflows are stable.

## Product pillars

### 1. Security, privacy and trust

Daraja handles employment history, CVs, contact details, applications, employer
data and eventually messages, project files and payments. Protection is not a
later hardening task.

The platform must provide:

- secure authentication and session handling;
- server-side ownership and permission checks;
- private-by-default candidate data and files;
- safe uploads and authenticated document access;
- secret management and credential rotation;
- rate limits and abuse/fraud controls;
- audit evidence for privileged changes;
- safe provider/webhook boundaries;
- backups, rollback and incident recovery;
- privacy-preserving analytics and AI data minimisation.

`SECURITY.md` is the detailed baseline.

### 2. Candidate career workspace, CV Builder and AI CV Builder

Authenticated candidates maintain a reusable career identity with profile,
skills, location, work preferences, saved jobs, applications, alerts and
private documents.

The CV Builder is a first-class product, not only a file-upload feature.
Candidates should be able to create and maintain structured career information:

- contact/profile details;
- professional summary/objective;
- work experience;
- education;
- skills;
- projects;
- certifications;
- languages;
- portfolio/links;
- optional references;
- layout/template choices;
- multiple saved CV versions;
- ATS-friendly PDF export.

A candidate may keep a Master CV and create tailored versions for different
industries, roles or individual vacancies.

The AI CV Builder may help rewrite candidate-provided content, strengthen bullet
wording, suggest summaries, identify likely ATS gaps, suggest skills supported by
existing facts, tailor a CV to a specific vacancy and generate cover-letter
drafts.

AI must never invent employers, dates, qualifications, certificates,
achievements or skills. Every AI change must be previewable and explicitly
approved by the candidate before it becomes part of a saved CV version.

Candidate documents and generated CVs are private by default. Employer access
must follow explicit application/talent-discovery permissions.

### 3. Jobs

Public discovery of verified government, NGO, corporate, finance, healthcare,
education, technology, engineering, graduate, internship, contract and remote
vacancies.

Public users can browse, search and open vacancy details without an account.
Closed vacancies belong in Expired, not Open. External applications must lead
to the final official application/login destination, not an intermediate
institution description page when a safe final CTA can be resolved.

Jobs should feed the candidate career system: save, alert, compare fit, tailor a
CV and apply. Public discovery must remain useful even when the user has no
account.

### 4. Employer hiring SaaS

Verified employers can maintain company profiles, publish vacancies, manage
applications, shortlist candidates, collaborate with team members, search a
consented talent pool and view hiring analytics.

Employer verification and job moderation remain trust controls. Imported public
vacancies and employer-owned vacancies must have clear provenance.

Employers must never receive unrestricted access to private candidate CVs or
contact details merely because they have an account. Access follows candidate
consent/application rules and employer permissions.

### 5. Freelance marketplace

Daraja will support both marketplace patterns:

- service-first: freelancer services/packages similar to a catalogue;
- project-first: clients post projects and freelancers submit proposals.

Planned entities and journeys include freelancer portfolios, services,
packages, client briefs, proposals, conversations, contracts, milestones,
deliverables, revisions, completion, reviews and disputes.

A user may eventually hold more than one marketplace capability. For example,
a candidate may also freelance and buy services. The current single `User.role`
is therefore a transitional implementation constraint, not the desired final
identity model.

Private messages, proposals, deliverables and project files follow the same
security/privacy baseline as candidate documents unless explicitly published.

### 6. Payments and monetisation

Daraja may monetise employer subscriptions, promoted listings, premium career
features, freelancer marketplace fees and other clearly disclosed services.

Payments should be provider-backed, support relevant regional currencies and
mobile money/card methods, and use auditable state transitions. Daraja must not
claim or simulate regulated escrow unless a licensed structure/provider is in
place.

Daraja should minimise payment-card scope and never store raw card numbers/CVV.

### 7. AI work engine

AI is a shared platform capability, not a separate chatbot feature.

Candidate uses:
- AI CV Builder and CV tailoring;
- cover-letter drafting from candidate-approved facts;
- natural-language job search;
- explainable job matching;
- profile improvement suggestions;
- career guidance and interview preparation.

Employer uses:
- structured job-post drafting;
- skills and screening-question suggestions;
- explainable candidate matching and ranking;
- hiring-workflow assistance.

Freelancer/client uses:
- service-page drafting;
- project brief generation;
- proposal assistance;
- milestone/deliverable suggestions;
- semantic matching between work and talent.

Trust uses:
- spam/fraud signals;
- duplicate detection;
- content-quality assistance;
- moderation triage.

AI output must be bounded, reviewable and explainable where it affects work
opportunities. Human control is required for rejection, suspension, payment,
dispute and other consequential decisions. Core workflows must continue to
work when AI is unavailable.

## East Africa product requirements

- mobile-first responsive UX;
- low-bandwidth tolerant pages;
- English and Swahili readiness;
- country/city/region-aware location taxonomy;
- TZS/KES/UGX/RWF/USD-ready money representation;
- mobile-money compatible payment abstraction;
- WhatsApp-friendly notifications where officially supported;
- local employer verification and fraud controls;
- support for public-sector, NGO and graduate employment patterns;
- remote/global opportunities without losing regional relevance.

## Mobile application direction

The future iOS and Android applications must be clients of the same protected
Daraja backend/API and database rather than separate products.

A saved job, CV version, application, message or marketplace contract must be
the same record whether accessed from web, iOS or Android.

Do not embed private provider credentials or business-authorisation logic in the
mobile apps. Mobile should come after core web/API workflows are stable.

## Trust principles

- show source provenance for imported opportunities;
- never fabricate jobs, employers, application destinations or deadlines;
- preserve expired history rather than deleting records routinely;
- protect candidate contact/profile/CV information by default;
- separate paid promotion from organic relevance;
- make AI assistance distinguishable from verified employer/source facts;
- never allow AI to fabricate candidate career facts;
- give users clear controls for alerts, consent, subscriptions, data export and
  deletion requests;
- verification badges must represent completed verification checks.

## North-star journeys

Candidate: Discover -> create career profile/CV -> understand fit -> tailor ->
save/alert -> apply -> track -> grow.

Employer: Verify -> publish/source -> review permitted candidate data ->
shortlist -> hire -> measure.

Freelancer: Build profile -> publish services/find projects -> propose ->
contract -> deliver -> get reviewed/paid.

Client: Define need -> discover/match -> compare -> contract -> approve
milestones -> review.
