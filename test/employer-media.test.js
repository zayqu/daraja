const test = require("node:test");
const assert = require("node:assert/strict");

const {
  enrichJobsWithOfficialEmployerMedia,
  getEmployerHomepage,
  normalizeEmployerName,
} = require("../scraper/lib/employer-media");

test("matches only explicitly verified employer aliases", () => {
  assert.equal(
    getEmployerHomepage("Kampuni ya Meli Tanzania (TASHICO)"),
    "https://www.tashico.co.tz/"
  );
  assert.equal(
    getEmployerHomepage("Tanzania Shipping Company Limited"),
    "https://www.tashico.co.tz/"
  );
  assert.equal(getEmployerHomepage("Unknown Shipping Company"), null);
});

test("normalizes employer labels without fuzzy matching", () => {
  assert.equal(
    normalizeEmployerName("Tanzania Shipping Company Limited (TASHICO)"),
    "tanzania shipping company limited tashico"
  );
});

test("enriches missing media from the verified official employer homepage once", async () => {
  const calls = [];
  const jobs = [
    {
      title: "Deck Officer II",
      company: "Kampuni ya Meli Tanzania (TASHICO)",
      companyLogo: null,
      representativeImage: null,
    },
    {
      title: "Marine Engineer II",
      company: "Kampuni ya Meli Tanzania (TASHICO)",
      companyLogo: null,
      representativeImage: null,
    },
  ];

  await enrichJobsWithOfficialEmployerMedia(jobs, {
    fetchFn: async (url) => {
      calls.push(url);
      return {
        ok: true,
        headers: new Headers({ "content-type": "text/html" }),
        text: async () =>
          '<header class="site-brand"><img class="site-logo" src="/assets/tashico-logo.png" alt="TASHICO logo"></header>',
      };
    },
  });

  assert.deepEqual(calls, ["https://www.tashico.co.tz/"]);
  assert.equal(
    jobs[0].companyLogo,
    "https://www.tashico.co.tz/assets/tashico-logo.png"
  );
  assert.equal(jobs[1].companyLogo, jobs[0].companyLogo);
});
