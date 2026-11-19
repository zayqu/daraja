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
- keep the dock Daraja-owned: Poppins, Daraja navy/teal, no template branding
- use only routes Daraja actually owns today
- do not expose messages, application tracking, uploads or other template
  features until the corresponding Daraja backend/product feature exists

Current mobile navigation (task-first, D-038):
- Rule: every tab opens a page; only More opens a menu
- Visitors: Home, Jobs, Freelance, More
- Candidates: Discover, My jobs (Saved / Applied / Closed), CV, Profile (page)
- Employers: Overview, Vacancies, Post job (solid navy action button), Account (page)
- Admins: Overview, Jobs, Employers (badges count pending reviews), More
- Profile/Account pages follow the Makarya reference (owner, Nov 2026): centred
  identity, gear menu (Edit, Account settings), candidate tabs Experience /
  Skills / CVs; Account settings is a short list ending with Sign out; the
  admin More sheet keeps rarely used tools as compact links (at most three
  quarters of the screen, never a tile grid)
- Labels: "About Daraja", "WhatsApp Channel"; normal weight for menu labels,
  semibold only for titles and the current item
- Header icons: Sign in for visitors, the notifications bell for candidates;
  no second account icon or hamburger (D-027)
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

Daraja mapping (signed-in dashboards, D-038):
- candidate dashboard overview (`/account`): exists, with real counts only
- candidate profile, job alerts, notifications and settings: exist
- saved jobs (`/account/saved`, Save button on job pages): exists
- Daraja-managed applications (`/account/applications`): exists
- CV Builder/resume: exists (`/account/career/cv`)
- candidate and employer messaging, interviews, Apply on Daraja and the
  employer applicant list: next phase; they need new database tables and are
  not shown until they exist
- employer dashboard overview, company profile and verification: exist
- vacancy submission, edit, send again and close (`/employer/vacancies`): exist
- full ATS: future employer phase
- saved-candidate access: future and must respect candidate consent/privacy
- membership/billing: candidates are never charged (D-036); employers can buy
  a featured vacancy at `/advertise`

## Implementation rule

Every adopted pattern must be rebuilt using the centralized Daraja UI system:

- `styles/tokens.css`
- `components/ui/PageHero` and `components/ui/WorkspaceShell` (public content pages)
- `components/ui/SurfaceCard`
- `components/dashboard/DashboardShell`, `components/dashboard/DashboardUi` and
  `lib/dashboard-navigation.js` (every signed-in dashboard)
- `components/ui/MobileDock`

Do not import a template's routing, CSS framework, fonts, demo content,
authentication assumptions or unsupported product features.
