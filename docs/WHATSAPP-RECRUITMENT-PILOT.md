# DARAJA WhatsApp recruitment pilot — operating playbook

**Status:** Preparation only. No public recruitment invitation or production deployment is authorised by this document.
**Owner:** DARAJA administrator / employer-workstream operator.
**Channel:** https://whatsapp.com/channel/0029Vanw1OQ1CYoYdxl32g3V

## Objective and scope
Test whether verified vacancy distribution can drive useful candidate action, not simply views. Invite up to three verified employers and promote one approved current vacancy each. Keep access to ordinary vacancies free. Do not take applications or CVs over the pilot contact inbox.

## Existing system to reuse
- Authenticated employer profile, employer verification and review queue.
- Existing employer vacancy submission, moderation, public job pages and official Apply routing.
- Sitewide analytics helper and existing job-apply events; do not count these as completed applications.
- Use the existing admin audit trail. No second verification system or payment integration.

## Before recruitment outreach
1. The public pilot page routes employers into the existing authenticated `/employer` workspace only when its site setting enables that portal; otherwise it displays enrolment-not-open messaging. **There is no unverified email contact CTA or unprotected submission form.**
2. Verify the employer portal is enabled and works on the intended deployed environment. An enabled source-code route alone is not proof that production is enabled.
3. Confirm Google Analytics is configured, consented and actually receiving a test campaign event in **preview**; otherwise report site sessions and Apply clicks as unavailable rather than zero. Do not send test notifications to users.
4. Confirm legal/privacy notices cover operational employer contact and campaign reporting; use minimum fields and authorised access.
5. Establish a private campaign ledger accessible only to authorised DARAJA staff, not a public repository. Never store candidate names, email addresses or CVs in analytics.
6. Agree pilot acceptance, publishing dates, approved vacancy URL, follow-up contact and employer permission to quote results.

## Pilot intake / verification
Required: organisation name; official website; identifiable work contact; role title; location; complete vacancy; closing date; safe official apply URL; confirmation the employer authorises promotion. Check identity against the company site or credible independent evidence. Verify the destination does not request applicant payment. Reject expired, misleading, unverifiable or fee-based vacancies. Record verification and moderator decision through existing protected workflows.

## Measurement: source-specific funnel
For each pilot vacancy, record:
- campaign ID (opaque identifier), employer ID, verified Job ID/slug, channel placement date/time;
- the exact WhatsApp post URL where available;
- 24-hour and 7-day channel views **entered manually from channel insights**;
- tagged landing-page sessions and Apply link interactions when analytics consent and configuration allow;
- completed applications **only if independently reported by the employer**, with source attribution explained;
- relevant applications, interviews and hires only as employer-reported outcomes, labelled clearly;
- notes on data completeness, consent gaps and attribution limits.

Use a campaign link of the form:
`https://ajira.daraja.co.tz/jobs/<verified-job-slug>?utm_source=whatsapp&utm_medium=channel&utm_campaign=daraja_pilot_<opaque-id>`.
The UTM parameter identifies referral campaigns when the analytics platform records it. It does **not** prove an applicant completed an employer-hosted application. The existing Apply event is a click intent, not a completed application. On this branch, job-detail Apply clicks carry `campaign_id` and `distribution_channel=whatsapp` in the `apply_job` analytics event only when the URL contains `utm_source=whatsapp&utm_medium=channel` and a valid `daraja_pilot_` identifier (4–40 lowercase letters, digits, underscores or hyphens after the prefix). The client analytics helper emits events only when the configured consent-aware `gtag` is available. This attribution is **not server-side durable tracking** and must never be reported as a complete click count. GA4 campaign landing sessions should be queried separately, subject to consent.

When consent prevents analytics, record the metric as unavailable; never replace missing measurements with estimates. Do not use open redirects or accept arbitrary destination URLs for campaign links.

## Private campaign ledger columns
`campaign_id,employer_id,job_id,posting_date,post_url,utm_campaign,views_24h,views_7d,site_sessions,apply_clicks,completed_applications_employer_reported,relevant_applications_employer_reported,interviews_employer_reported,hires_employer_reported,verified_by,notes,reported_at`

Do not put the private ledger in the public GitHub repository. Ensure access restriction, backup and retention policy before recording actual employer information.

## Reporting template
**Campaign:** [campaign ID] | **Employer:** [approved name] | **Vacancy:** [role]
**Published:** [date/time EAT] | **Source:** DARAJA WhatsApp Channel
**Views at 24 hours:** [recorded/unavailable]
**Views at 7 days:** [recorded/unavailable]
**Website sessions attributed to campaign:** [recorded/unavailable]
**Apply-link clicks:** [recorded/unavailable]
**Completed applications:** [employer reported number/unavailable]
**Relevant applications:** [employer reported number/unavailable]
**Interviews / hires:** [employer reported numbers/unavailable]
**Measurement note:** Views, website sessions and Apply clicks cannot be added together or described as unique applicants; employer-reported outcomes are not independently verified unless documented.

## Exit criteria
- Three verified employer campaigns delivered or documented reason for fewer.
- All campaign views reported with actual timestamp or marked unavailable.
- Source-specific referral links tested and functioning; `apply_job` carries the validated campaign parameter in consenting preview analytics, or reporting explicitly marks analytics unavailable.
- No fraudulent or expired vacancy, no candidate-data leak, no unapproved payment collection.
- Employer feedback collected and clearly separated from platform-measured data.
- Commercial price reconsidered only after results support a value proposition.

## Future implementation (not part of this first PR)
Consider a protected campaign model, campaign-specific server metrics and a minimal advertiser report only when manual pilots establish demand. Any Prisma change requires reviewed additive migration and production restore point. Never treat WhatsApp Channel as having an automatic posting API without independently validating Meta's supported capabilities.

## Release gate
This pilot page does not collect submitted form data or touch the schema. Before releasing, verify the server-controlled employer portal flag and that authenticated employer registration, verification, vacancy submission and the pilot CTA work together; test mobile rendering and links; run tests, lint and production build in CI; review preview deployment; obtain explicit owner approval for production deployment. If the portal is disabled, the CTA intentionally shows that enrolment is closed. The intended environment remains cPanel production, Neon PostgreSQL, GitHub source and Vercel preview.

## First-phase intake decision (2026-11-03)
Pilot interest is assessed manually from verified employer submissions in the existing admin verification/job review queue. The `/advertise` page does not create a second unauthenticated employer form, email inbox, marketing lead list or new schema. Staff contact the employer only through their recorded account email with a legitimate pilot invitation and confirmation. The pilot is limited to three accepted employers; an employer account or vacancy does not automatically reserve a slot.

This avoids reliance on the unverified inbound address `jobs@alerts.daraja.co.tz`. A dedicated commercial mailbox or campaign intake form should be added only when its delivery, rate limits, privacy notice and authorised access are verified. This is not a prerequisite for the verified-employer pilot.

## Agency-safe distribution and reporting implementation (development, 5 Nov 2026)

DARAJA is a recruitment **distribution and advertising** service, not a recruiting, screening or placement agency. Agency-owned and employer-owned vacancies remain controlled by the verified partner. The partner supplies its own official HTTPS ATS destination, retains applicant records and makes hiring decisions. The `PARTNER_DIRECT` route is the default and sends users from the WhatsApp post to the partner's website with non-personal UTM tags; DARAJA does not observe these external applicant sessions or clicks. `AJIRA_LANDING` is optional and uses the existing Ajira job page and consent-aware GA4 integration. Consent/partner agreement must name the approved vacancy, destination mode, attribution and reporting scope.

First-party implementation under review in branch `feature/recruitment-distribution-reporting`:
- New additive `DistributionCampaign` model, scoped to a verified partner employer account and one owned, published live vacancy. The new table and migration are NOT yet approved for production application.
- Admin creates a DRAFT only with an explicit partner-permission attestation and internal approval reference. The campaign receives an opaque, validated UTM identifier. Admin may enter WhatsApp insights or employer-reported outcomes; all writes are audited. Marking LIVE only documents that an actual post URL exists; it does not send WhatsApp messages.
- Partner account receives private view-only reports at `/employer/campaigns`; an authenticated session and employer ID are required for every read. Printable report at `/employer/campaigns/[id]/report`; the browser can save as PDF, but DARAJA does not automatically send emails.
- Missing values remain null/unavailable. There is no server-side automatic Apply tracking or confirmed GA4 Data API integration yet, and manual entry of GA4 counts is prohibited. Direct-to-partner destinations cannot be measured by Ajira beyond views manually transcribed from WhatsApp insights; if the agency shares its analytics, they must be separately authenticated and sourced before reporting.
- No CVs, candidate names, applicants, conversion pixels, cookies, scraped private ATS records or automatically posted WhatsApp campaigns are included.

**Release gate:** verify migration against nonproduction database, record a fresh production restore point, review ownership and CSRF tests, run full CI/preview, test with authorised employer accounts, and obtain separate production schema/release approval. No outreach until direct-to-partner URLs and reporting limitations are approved by each partner.
