# Tanzania recruitment-source audit — October 2026

Status: implementation input for Daraja source expansion

## Enabled in this batch

### Empower Tanzania
- Canonical jobs page: https://www.empower.co.tz/empower-jobs
- Current activity observed: active vacancy catalogue with live expiry indicators.
- Daraja mode: official listing-page discovery + official detail verification.
- Publication rule: Tanzania relevance + parseable unexpired deadline + valid official detail.

### Shugulika Africa Limited
- Canonical jobs page: https://www.shugulika.com/jobs
- Current activity observed: active Tanzania vacancies with posted date, deadline, location and Apply destination.
- Daraja mode: official listing-page discovery + official detail verification.
- Publication rule: Tanzania relevance + parseable unexpired deadline + official Apply destination.

### Career Options Africa Group — Tanzania
- Canonical jobs page: https://www.careeroptionsafricagroup.com/jobs
- Current activity observed: current Tanzania vacancies mixed with other African markets.
- Daraja mode: official listing-page discovery + Tanzania filtering + official detail verification.
- Publication rule: Tanzania evidence + parseable unexpired closing date + official detail/application route.

### CVPeople Tanzania
- Canonical career host: https://cvpeopletanzania.zohorecruit.com/jobs/Careers
- Current activity observed: recent Tanzania vacancies on the organisation's Zoho Recruit career site.
- Daraja mode: bounded Google discovery restricted to the exact official Zoho Recruit host, then official-page verification.
- Search result snippets are never sufficient for publication.

### Q-Sourcing Servtec Tanzania
- Canonical career host: https://qsourcing.zohorecruit.com/jobs/Careers
- Current activity observed: Tanzania vacancies on the organisation's Zoho Recruit career site.
- Daraja mode: bounded Google discovery restricted to the exact official Zoho Recruit host, then official-page verification.
- Pages stating “no longer accepting applications” or “posting no longer available” are rejected.

### eKazi / Exact Manpower Consulting Ltd
- Canonical jobs page: https://api.ekazi.co.tz/find-job
- Current activity observed: multiple live October/November 2026 vacancies published by Exact Manpower Consulting Ltd, with explicit deadlines and vacancy-level detail pages.
- Daraja mode: official eKazi listing-page discovery + vacancy detail verification.
- Publication rule: Tanzania relevance + parseable unexpired deadline + official detail/application login flow.
- Expired eKazi pages are rejected even if they remain indexed by a search engine.

## Held back

### Manpower Tanzania / Manpower Holdings
The Tanzania corporate website is active and advertises current recruitment, but the linked global job portal currently mixes apparently current job IDs with older/stale job content. It is not enabled until Daraja can resolve a stable vacancy-level source contract without risking stale jobs.

### Radar Recruitment
The organisation is active and currently recruiting, but the public corporate site does not expose a reliable current vacancy feed. Social posts alone are not sufficient for automatic Daraja publication.

### HR World
The organisation is operating, but its own public Job Vacancies page currently exposes no vacancy articles. It remains disabled.

### Reveurse Tanzania
The company is active and recent recruitment activity exists, but current vacancy evidence is primarily on third-party social/job surfaces rather than a stable official vacancy feed. It remains a monitored source, not an automatic publisher.

## Expansion rule

A source is not enabled because it merely exists or claims to recruit in Tanzania. Daraja requires a current, verifiable vacancy surface and a deterministic way to reject expired/closed listings. Search engines may help discover official vacancy URLs, but the official employer/ATS/verified-agency page remains the publication authority.
