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
1. Verify that the intended enquiry mailbox **jobs@alerts.daraja.co.tz** accepts incoming mail (it may currently be an outbound-only alert sender). If it cannot receive enquiries, replace the landing-page link with a verified contact method *before deployment*.
2. Review live employer portal availability and authentication; a repository feature alone is not proof that production has it enabled.
3. Confirm legal/privacy notices cover operational employer contact and campaign reporting; use minimum fields and authorised access.
4. Establish a private campaign ledger accessible only to authorised DARAJA staff, not a public repository. Never store candidate names, email addresses or CVs in analytics.
5. Agree pilot acceptance, publishing dates, approved vacancy URL, follow-up contact and employer permission to quote results.

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
The UTM parameter identifies referral campaigns when the analytics platform records it. It does **not** prove an applicant completed an employer-hosted application. The existing Apply event is a click intent, not a completed application.

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
- Source-specific referral links tested and functioning.
- No fraudulent or expired vacancy, no candidate-data leak, no unapproved payment collection.
- Employer feedback collected and clearly separated from platform-measured data.
- Commercial price reconsidered only after results support a value proposition.

## Future implementation (not part of this first PR)
Consider a protected campaign model, campaign-specific server metrics and a minimal advertiser report only when manual pilots establish demand. Any Prisma change requires reviewed additive migration and production restore point. Never treat WhatsApp Channel as having an automatic posting API without independently validating Meta's supported capabilities.

## Release gate
This pilot page does not collect submitted form data or touch the schema. Before releasing, verify the receiving mailbox, mobile rendering and relevant links; run tests, lint and production build in CI; review preview deployment; obtain explicit owner approval for production deployment. The intended environment remains cPanel production, Neon PostgreSQL, GitHub source and Vercel preview.
