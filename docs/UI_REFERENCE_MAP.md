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
- Bottom dock, signed out: Home, Jobs, Freelance, More
- Candidates: Discover, Saved, Applications, Profile
- Employers: Overview, Vacancies, Post job (highlighted main action), Account
- Admins: Overview, Jobs, Employers (badges count pending reviews), More
- The last tab opens a short list (no tile grid, at most three quarters of
  the screen) with the rest of the role's menu from `lib/dashboard-navigation.js`
  in two groups, a line of Daraja links, and a quiet Sign out beside the
  account name; visitors get Sign in / Create account buttons instead
- Header icons: Sign in for visitors, the notifications bell for candidates;
  no second account icon or hamburger (D-027)
- dashboard pages hide their sidebar at the same width the dock appears
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
