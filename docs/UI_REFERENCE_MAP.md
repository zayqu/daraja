# Daraja UI reference map

Daraja owns the product, brand, architecture and business logic. Licensed
templates are used only to study useful interaction and information patterns.

## Reference roles

### Jobtex — public jobs experience

Use for:
- public discovery hierarchy
- job-list composition
- job-detail composition
- search/filter presentation
- public CTA hierarchy

Current status:
- homepage, jobs listing and job detail have already been adapted into Daraja
- no Jobtex framework, branding, demo data or font is used

### Jobko — mobile/PWA behaviour

Useful patterns observed:
- fixed mobile bottom navigation
- compact job discovery
- search/filter sheets
- application-status surfaces
- notifications
- profile-oriented mobile flow

Daraja decision:
- adopt a shared floating mobile bottom dock now
- keep the dock Daraja-owned: Geist, Daraja navy/teal, no template branding
- use only routes Daraja actually owns today
- do not expose messages, application tracking, uploads or other template
  features until the corresponding Daraja backend/product feature exists

Current mobile dock:
- Home
- Jobs
- Alerts
- More
- More sheet: Internships, About, Contact, WhatsApp Channel and conditional
  Post a Job
- hidden from employer, admin, post-job and authentication surfaces until
  dedicated workspace navigation is designed for those roles
- respects iPhone safe-area insets and viewport-fit=cover

### Jobi — candidate/employer SaaS depth

Useful candidate patterns:
- dashboard overview
- profile
- saved jobs
- resume/CV
- settings
- alerts
- messaging

Useful employer patterns:
- dashboard overview
- company profile
- jobs management
- vacancy submission
- saved candidates
- messaging
- membership/billing

Daraja mapping:
- candidate profile/account foundation: exists
- job alerts: exists
- saved jobs/application foundation: exists
- CV Builder/resume: future candidate phase
- candidate messaging: future, not invented from template
- employer profile/verification: exists
- vacancy submission/moderation: exists
- full jobs management/ATS: future employer phase
- saved-candidate access: future and must respect candidate consent/privacy
- employer messaging: future
- membership/billing: draft billing work remains parked until separately
  approved

## Implementation rule

Every adopted pattern must be rebuilt using the centralized Daraja UI system:

- `styles/tokens.css`
- `components/ui/PageHero`
- `components/ui/WorkspaceShell`
- `components/ui/SurfaceCard`
- `components/ui/WorkspaceTabs`
- `components/ui/MobileDock`

Do not import a template's routing, CSS framework, fonts, demo content,
authentication assumptions or unsupported product features.
