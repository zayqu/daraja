# Daraja product model

## Mission

Daraja connects people in East Africa to formal employment, freelance income
and verified organisations through one trusted work marketplace.

The initial market is Tanzania. The regional design target is Tanzania, Kenya,
Uganda and Rwanda, followed by wider East Africa.

## Product pillars

### 1. Jobs

Public discovery of verified government, NGO, corporate, finance, healthcare,
education, technology, engineering, graduate, internship, contract and remote
vacancies.

Public users can browse, search and open vacancy details without an account.
Closed vacancies belong in Expired, not Open. External applications must lead
to the final official application/login destination, not an intermediate
institution description page when a safe final CTA can be resolved.

### 2. Candidate career workspace

Authenticated candidates can maintain a reusable career identity with profile,
CV/document references, skills, location, work preferences, saved jobs,
application tracking and personalised alerts.

Future AI assistance may explain vacancy fit, identify missing requirements,
help improve a CV/profile and support natural-language job discovery. AI must
not silently change candidate data or make final hiring decisions.

### 3. Employer hiring SaaS

Verified employers can maintain company profiles, publish vacancies, manage
applications, shortlist candidates, collaborate with team members, search a
consented talent pool and view hiring analytics.

Employer verification and job moderation remain trust controls. Imported public
vacancies and employer-owned vacancies must have clear provenance.

### 4. Freelance marketplace

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

### 5. Payments and monetisation

Daraja may monetise employer subscriptions, promoted listings, premium career
features, freelancer marketplace fees and other clearly disclosed services.

Payments should be provider-backed, support relevant regional currencies and
mobile money/card methods, and use auditable state transitions. Daraja must not
claim or simulate regulated escrow unless a licensed structure/provider is in
place.

### 6. AI work engine

AI is a shared platform capability, not a separate chatbot feature.

Candidate uses:
- natural-language job search;
- explainable job matching;
- CV/profile improvement suggestions;
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
dispute and other consequential decisions.

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

## Trust principles

- show source provenance for imported opportunities;
- never fabricate jobs, employers, application destinations or deadlines;
- preserve expired history rather than deleting records routinely;
- protect candidate contact/profile information by default;
- separate paid promotion from organic relevance;
- make AI assistance distinguishable from verified employer/source facts;
- give users clear controls for alerts, consent, subscriptions and deletion
  requests.

## North-star journeys

Candidate: Discover -> understand fit -> save/alert -> apply -> track -> grow.

Employer: Verify -> publish/source -> review -> shortlist -> hire -> measure.

Freelancer: Build profile -> publish services/find projects -> propose ->
contract -> deliver -> get reviewed/paid.

Client: Define need -> discover/match -> compare -> contract -> approve
milestones -> review.
