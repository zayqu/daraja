# Daraja security and protection baseline

Security, privacy and trust are product requirements, not a final checklist. Daraja handles employment history, CVs, contact details, employer data, future private messages, marketplace transactions and AI-assisted workflows. Every feature must preserve these boundaries by default.

## Security priority

Before expanding into freelance marketplace, payments or broad AI automation, Daraja must have a dependable baseline for authentication, authorisation, data protection, uploads, secrets, logging, abuse controls, backups and incident recovery.

Security work does not block all product delivery, but no feature may bypass these controls to ship faster.

## Data classification

### Public

Examples: published job listings, public employer profile fields, public freelancer service pages, public reviews after moderation.

Public data may be cached/indexed when appropriate.

### Account-private

Examples: saved jobs, alert preferences, application history, unpublished profile settings, notification preferences.

Accessible only to the owning user and authorised Daraja staff/services.

### Sensitive personal data

Examples: CV content, phone numbers, addresses, employment history, education history, candidate documents, private portfolio files, private messages, proposal content and identity-verification evidence.

Default: private. Never expose through predictable public URLs.

### Highly sensitive / security data

Examples: passwords, session tokens, OAuth secrets, database credentials, API keys, webhook secrets, recovery tokens and payment-provider credentials.

Never store these in source control, logs, screenshots, support tickets, analytics events or client-side bundles.

## Identity and authentication

- Keep public job discovery open without requiring an account.
- Require authentication for personalised alerts, saved jobs, managed applications, candidate documents, employer workspaces, freelancer/client tools, messaging and payments.
- Derive the authenticated user server-side. Never trust caller-provided `userId`, employer ownership, freelancer ownership or admin authority.
- Sessions must use secure, HTTP-only cookies and production-safe same-site/host settings.
- Passwordless/email and OAuth flows must validate callback/redirect destinations.
- Sensitive account changes should require recent authentication where practical.
- Admin and high-privilege accounts should move toward mandatory MFA before marketplace/payment scale.

## Authorisation

Authentication is not authorisation.

Every protected write must verify both identity and ownership/capability. Examples:

- candidate can edit only their own profile/CV/documents;
- employer can access only its own jobs/applicants unless explicit team permissions allow otherwise;
- freelancer can edit only their own services/proposals/deliverables;
- client can access only their own projects/contracts;
- only authorised admins can verify employers, moderate users or resolve disputes.

High-impact actions require durable audit records.

## Account export and erasure

A user must be able to download account-linked data and permanently leave Daraja without support intervention. Deletion is not deactivation.

Account export and deletion must:

- derive identity from the authenticated server session, never a caller-supplied user ID;
- use the protected same-origin mutation boundary for destructive requests;
- require explicit, irreversible confirmation before deletion;
- revoke database sessions and remove OAuth/provider account material;
- stop and remove linked alerts, saved jobs and private profile state;
- delete Daraja-managed candidate applications and eligible private candidate files;
- remove candidate, freelancer and employer account profiles;
- detach surviving public employer vacancies from the deleted account rather than deleting public business records solely to remove the account;
- remove user/moderator/submission ownership pointers from surviving records;
- replace account identifiers on retained legacy payment/subscription evidence with an opaque deletion reference rather than an email, name or active user ID;
- de-identify retained audit actor/account references while preserving the minimum security event evidence;
- prevent deletion of the last administrator until another administrator exists;
- fail safely when private-file erasure cannot be prepared, and restore staged files when the database transaction fails;
- keep exports, deletion responses and errors private and non-cacheable;
- never include passwords, session tokens, OAuth tokens, private storage paths or document locators in export/download responses.

Every new model containing account-owned or private data must be added to the canonical account-erasure owner before that model is production-ready. A blind `User.delete`, an `active=false` flag, or orphaned private files do not satisfy account deletion.

## CV and document protection

CVs and candidate documents are sensitive personal data.

Target rules:

- store files in private object storage, not public web directories;
- persist opaque storage identifiers rather than permanent public URLs;
- access files through short-lived signed URLs or authenticated download routes;
- restrict allowed file types and sizes;
- verify file signatures/MIME type server-side rather than trusting extensions;
- scan uploads for malware before making them available to employers;
- strip unsafe metadata where appropriate;
- do not expose storage bucket credentials to browsers/mobile apps;
- employer access to a CV must follow candidate/application/talent-pool permissions;
- deletion/export requests must include associated stored files, subject to lawful retention requirements.

The current `CandidateDocument.url` implementation is a transitional model and must not be interpreted as permission to make documents publicly reachable.

## CV Builder and AI CV Builder safety

Daraja should provide both a standard CV Builder and an AI-assisted CV Builder.

The standard builder owns the candidate-approved source of truth: profile, work history, education, skills, projects, certifications, languages, references (optional), links and layout/template choices.

AI may:

- rewrite candidate-provided text for clarity;
- turn candidate-provided responsibilities into stronger bullet wording;
- suggest skills based on information already supplied;
- tailor a CV version to a specific job description;
- suggest summaries/objectives;
- identify missing information or likely ATS issues;
- generate cover-letter drafts from candidate-approved facts.

AI must not:

- invent employers, dates, degrees, certificates, salaries, achievements or skills;
- silently change factual career history;
- submit an application without explicit user action;
- share a CV with an employer without the user's authorised workflow;
- treat generated text as verified evidence.

All AI changes must be previewable and user-approved before becoming part of a saved CV version.

## CV versioning

A candidate should be able to maintain multiple CV versions, for example:

- Master CV;
- Accounting CV;
- Banking CV;
- Graduate CV;
- CV tailored to a specific vacancy.

Generated/tailored versions must remain linked to the candidate's source facts so AI output cannot quietly become the authoritative employment record.

## API and input security

- Validate all writes server-side with bounded schemas.
- Reject unknown/unsupported enum and lifecycle values.
- Rate-limit authentication, alerts, search abuse, application, messaging, proposal and AI endpoints as appropriate.
- Protect state-changing browser operations against CSRF where cookie authentication is used.
- Prevent open redirects.
- Continue SSRF protections for server-side application-destination resolution and any future URL import/fetch feature.
- Encode/sanitise untrusted rich text before rendering.
- Use parameterised ORM/database access; never construct SQL from raw user strings.

## Upload and content safety

Future portfolios, project attachments, employer assets, deliverables and message attachments follow the same private-upload boundary as CVs unless explicitly designed as public media.

Define:

- allowlisted file types;
- maximum sizes;
- malware scanning;
- image re-encoding where practical;
- authenticated download rules;
- retention/deletion policies;
- abuse/report handling.

## Secrets and provider credentials

- Keep secrets in server environment configuration or a dedicated secret manager.
- Never commit `.env` files containing production values.
- Rotate credentials immediately after accidental exposure.
- Use separate development/test/production provider credentials.
- Do not place server secrets in `NEXT_PUBLIC_*` variables.
- Mobile applications must never embed private API/provider credentials.

## Database and backups

- Neon remains the production relational database until a reviewed migration says otherwise.
- Use TLS connections and least-privilege credentials where provider capabilities allow.
- Create a fresh restore point before approved production schema migrations.
- Never run destructive migrations, resets, truncation or `db push` casually against production.
- Test restoration/recovery procedures periodically rather than assuming backups work.

## Payments

Daraja should minimise payment-card scope.

- Prefer licensed payment providers and hosted/tokenised checkout flows.
- Never store raw card numbers or CVV.
- Verify webhook signatures and provider references.
- All callbacks must be replay-safe/idempotent.
- Marketplace money must use integer minor units or decimal-safe types plus currency.
- Do not claim escrow/payment protection unless the legal/provider arrangement actually supports it.

## AI privacy and model safety

AI requests must follow data minimisation:

- send only fields needed for the task;
- avoid sending secrets, authentication data or unrelated private information;
- do not use private candidate/employer content for model training unless a provider agreement and explicit policy permit it;
- record provider/model/prompt version for important generated output where practical;
- validate structured AI output before using it;
- treat external job descriptions, CV text and messages as untrusted input that may contain prompt-injection instructions;
- never let model output directly authorise payments, moderation, account suspension, candidate rejection or dispute decisions.

Core workflows must still function when AI is disabled or unavailable.

## Logging, analytics and observability

Logs should contain enough information to investigate failures without leaking user data.

Never log:

- passwords/tokens/API keys;
- full CV/document contents;
- raw identity evidence;
- full private messages unless a narrowly controlled support workflow explicitly requires it;
- complete payment credentials.

Use durable audit events for privileged/admin changes, verification, moderation and future dispute/payment state changes.

Analytics must not receive sensitive candidate fields or document content.

## Abuse, fraud and trust

Daraja needs layered controls for:

- fake employers and fake jobs;
- duplicate/scam listings;
- freelancer/client fraud;
- phishing links;
- spam proposals/messages;
- account takeover;
- review manipulation;
- payment abuse;
- impersonation.

Verification badges must correspond to real completed verification checks, not marketing labels.

## Mobile application security target

Future iOS/Android apps must use the same protected backend APIs rather than embedding business rules locally.

- store session/refresh material only in platform-secure storage;
- never embed production secrets;
- use HTTPS only;
- support remote session revocation;
- minimise cached sensitive data;
- prevent sensitive data from being included in analytics/crash reports;
- use push-notification payloads that avoid unnecessary private content on lock screens.

## Incident response

For a suspected incident:

1. contain the affected credential/account/provider;
2. preserve relevant sanitised evidence;
3. rotate exposed secrets/tokens;
4. determine affected users/data and timeframe;
5. restore safe service from verified state;
6. notify users/providers/regulators when legally or contractually required;
7. document root cause and preventive actions in the repository/operations record.

## Security definition of done

A feature touching authentication, candidate data, files, employers, messages, payments or AI is not done until:

- ownership/permission checks are tested;
- inputs and outputs are bounded;
- sensitive data exposure is reviewed;
- logging/analytics are reviewed;
- abuse/rate-limit implications are considered;
- rollback/recovery is understood;
- mobile/API future compatibility is not knowingly broken;
- `SECURITY.md` and `DECISIONS.md` are updated when the boundary changes.
