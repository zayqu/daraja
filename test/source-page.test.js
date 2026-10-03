const test = require("node:test");
const assert = require("node:assert/strict");

const {
  extractApplicationDestination,
  extractSourceMedia,
  fetchSourcePageMetadata,
} = require("../scraper/lib/source-page");

const PAGE = "https://careers.example.co.tz/jobs/accountant";

test("extracts a direct application form destination", () => {
  assert.equal(
    extractApplicationDestination(
      '<a href="https://careers.example.co.tz/apply/123">Apply now</a>',
      PAGE
    ),
    "https://careers.example.co.tz/apply/123"
  );
});

test("extracts an external recruitment portal destination", () => {
  assert.equal(
    extractApplicationDestination(
      '<a href="https://jobs.smartrecruiters.com/Example/123-accountant">Apply for this job</a>',
      PAGE
    ),
    "https://jobs.smartrecruiters.com/Example/123-accountant"
  );
});

test("extracts login or register required application flows", () => {
  assert.equal(
    extractApplicationDestination(
      '<a href="/auth/login">Login to Apply</a><a href="/register">Register</a>',
      PAGE
    ),
    "https://careers.example.co.tz/auth/login"
  );
});

test("preserves email application methods", () => {
  assert.equal(
    extractApplicationDestination(
      '<a href="mailto:jobs@example.co.tz?subject=Accountant">Email your application</a>',
      PAGE
    ),
    "mailto:jobs@example.co.tz?subject=Accountant"
  );
});

test("uses the source page itself when it genuinely contains the application form", () => {
  const html = `
    <form method="post">
      <h2>Submit application</h2>
      <input name="full-name" />
      <input type="email" name="email" />
      <input type="file" name="cv" />
      <button type="submit">Submit application</button>
    </form>
  `;

  assert.equal(extractApplicationDestination(html, PAGE), PAGE);
});

test("prefers official structured organisation logos over representative images", () => {
  const html = `
    <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "JobPosting",
        "hiringOrganization": {
          "@type": "Organization",
          "name": "Example",
          "logo": "https://careers.example.co.tz/assets/logo.png"
        },
        "image": "https://careers.example.co.tz/assets/job-photo.jpg"
      }
    </script>
    <meta property="og:image" content="https://careers.example.co.tz/assets/social.jpg" />
  `;

  assert.deepEqual(extractSourceMedia(html, PAGE), {
    companyLogo: "https://careers.example.co.tz/assets/logo.png",
    representativeImage: "https://careers.example.co.tz/assets/job-photo.jpg",
  });
});

test("uses a representative source image when no official logo is available", () => {
  assert.deepEqual(
    extractSourceMedia(
      '<meta property="og:image" content="/media/team-at-work.jpg">',
      PAGE
    ),
    {
      companyLogo: null,
      representativeImage: "https://careers.example.co.tz/media/team-at-work.jpg",
    }
  );
});

test("returns no media when the source exposes nothing reliable", () => {
  assert.deepEqual(extractSourceMedia("<main>No images</main>", PAGE), {
    companyLogo: null,
    representativeImage: null,
  });
});


test("reads lazy-loaded official logo markup", () => {
  assert.deepEqual(
    extractSourceMedia(
      '<header><a class="navbar-brand" href="/"><img data-src="/assets/employer-mark.svg" alt="Example brand logo"></a></header>',
      PAGE
    ),
    {
      companyLogo: "https://careers.example.co.tz/assets/employer-mark.svg",
      representativeImage: null,
    }
  );
});

test("does not treat a generic company UI icon as an employer logo", () => {
  assert.deepEqual(
    extractSourceMedia(
      '<main><img src="/icons/company.svg" alt="Company"><p>Example Bank</p></main>',
      PAGE
    ),
    {
      companyLogo: null,
      representativeImage: "https://careers.example.co.tz/icons/company.svg",
    }
  );
});

test("fetches source-page metadata from the official posting page", async () => {
  const metadata = await fetchSourcePageMetadata(PAGE, {
    fetchFn: async () => ({
      ok: true,
      headers: new Headers({ "content-type": "text/html; charset=utf-8" }),
      text: async () =>
        '<img alt="Example logo" src="/assets/logo.png"><a href="/apply/123">Apply now</a>',
    }),
  });

  assert.equal(
    metadata.companyLogo,
    "https://careers.example.co.tz/assets/logo.png"
  );
  assert.equal(
    metadata.applicationUrl,
    "https://careers.example.co.tz/apply/123"
  );
});
