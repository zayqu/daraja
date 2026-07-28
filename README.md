# Daraja Jobs

Daraja Jobs is a Tanzania-focused job listing application built with Next.js,
PostgreSQL, and Prisma.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

## Job source scrapers

The enabled source scrapers run through GitHub Actions every hour. They
validate and deduplicate vacancies before writing them to PostgreSQL, update
existing vacancies, and archive expired records.

`scraper/config/source-catalog.json` contains the source catalogue. A source is
only collected when it has a tested adapter and both `enabled` and `adapter` are
set. This prevents unverified websites from publishing duplicate, blocked, or
non-Tanzania jobs. The Daraja website itself is deliberately excluded to prevent
a scraping loop.

The repository must have a GitHub Actions secret named `DATABASE_URL`. Run the
scraper locally with:

```bash
npm run scrape
```

Use a read-only collection run that does not access the database with:

```bash
npm run scrape:dry
```

Run only one enabled source by adding `--source`, for example:

```bash
npm run scrape:dry -- --source=reliefweb
```

The scheduled workflow can also be started manually from **Actions → Job Source
Scrapers → Run workflow**.

### Production database changes

The hourly scraper never applies Prisma migrations. Scraping and schema
deployment are deliberately separate so a routine source run cannot change the
production database structure.

Before deploying a migration:

1. Create or confirm a recent Neon production restore point and record its
   timestamp.
2. Review the generated SQL and its rollback or recovery plan.
3. Apply the migration from a controlled deployment after approval.
4. Verify the schema and application on preview or staging before production.

Do not add `prisma migrate deploy` or `prisma migrate resolve` to the scheduled
scraper workflow.

### Application-link standard

Every enabled adapter must store the final candidate action, not the discovery
article:

- Online applications use the vacancy-specific employer or official ATS
  application URL.
- Vacancies requiring an account use the vacancy-specific employer login or
  registration step.
- Email applications use a validated `mailto:` link with the recipient, job
  title, and a professional application body prepared for the candidate.
- Generic news articles, career homepages, and job-search result pages are not
  valid application links.

The intended journey is: read the complete vacancy once on Daraja, select
**Apply**, then submit the application or sign in on the official destination.

## Advertising configuration

The job-listing page contains an optional responsive Google AdSense placement.
It renders nothing until valid production environment variables are configured:

```bash
NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT=ca-pub-xxxxxxxxxxxxxxxx
NEXT_PUBLIC_GOOGLE_ADSENSE_JOB_LIST_SLOT=xxxxxxxxxx
```

Job-detail pages remain advertisement-free around the application action so ads
cannot be confused with the Apply button. Add the real publisher and slot IDs
only after the domain is approved in AdSense.

Daraja publishes the confirmed Google publisher authorization record at
`/ads.txt` and provides public About, Contact, Editorial Policy, Privacy and
Terms pages. Advertising remains visually separated from vacancy content and
application actions.

## Job-alert configuration

Public job browsing remains open. Saving job-alert preferences requires a
verified candidate account using Google OAuth or a passwordless email link.
Configure the following Vercel variables for Preview and Production:

- `AUTH_SECRET`
- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`
- `RESEND_API_KEY`
- `JOB_ALERTS_FROM_EMAIL`, using a sender on a domain verified by Resend

Google's authorized production callback URL is:

`https://www.ajira.daraja.co.tz/api/auth/callback/google`

The hourly scraper sends a concise digest containing only vacancies in a
candidate's exact selected categories, further limited by any optional
location, experience, work-arrangement, organisation or keyword preferences.
Delivery attempts are logged and use stable idempotency keys to prevent
duplicate messages.

The scraper workflow also requires:

- GitHub Actions secret `RESEND_API_KEY`
- GitHub Actions variable `JOB_ALERTS_FROM_EMAIL`, using a sender on a domain
  verified by Resend, for example `Daraja Jobs <jobs@alerts.example.co.tz>`

If either value is absent, scraping continues normally and email delivery is
safely skipped. Every alert contains a unique unsubscribe link with a
confirmation screen, plus standards-compliant one-click unsubscribe headers
for supporting email clients. The
WhatsApp CTA always links directly to the official Daraja WhatsApp Channel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
