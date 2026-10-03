const test = require("node:test");
const assert = require("node:assert/strict");
const CryptoJS = require("crypto-js");

const {
  collectAjiraJobs,
  encryptAjiraId,
  getAjiraDetailUrl,
} = require("../scraper/sources/ajira");

const ENCRYPTION_KEY = "*n%^+-$#@$$^@1ERFWFW";

function decryptAjiraId(value) {
  const key = CryptoJS.enc.Utf8.parse(ENCRYPTION_KEY);
  return CryptoJS.AES.decrypt(value.replace(/juam/g, "/"), key, {
    keySize: 128 / 32,
    iv: key,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  }).toString(CryptoJS.enc.Utf8);
}

test("Ajira detail URL contains the encrypted official vacancy ID", () => {
  const encryptedId = encryptAjiraId(13755);
  assert.equal(decryptAjiraId(encryptedId), "13755");
  assert.equal(
    getAjiraDetailUrl(13755),
    `https://portal.ajira.go.tz/view-advert/${encryptedId}`
  );
});

test("collectAjiraJobs maps the rendered Advert Name into a valid job", async () => {
  const sourceUrl = getAjiraDetailUrl(13755);
  const jobs = await collectAjiraJobs({
    rows: [
      {
        title: "ARTISAN II (MINERAL LABORATORY)",
        company: "Geological Survey of Tanzania",
        deadline: "06/08/2027",
        numberOfPosts: "4 Posts",
        sourceUrl,
        companyLogo: "https://portal.ajira.go.tz/media/gst-logo.png",
      },
    ],
  });

  assert.equal(jobs.length, 1);
  assert.equal(jobs[0].sourceId, "13755");
  assert.equal(jobs[0].title, "ARTISAN II (MINERAL LABORATORY)");
  assert.equal(jobs[0].company, "Geological Survey of Tanzania");
  assert.equal(jobs[0].deadline.toISOString(), "2027-08-06T23:59:59.000Z");
  assert.equal(jobs[0].sourceUrl, sourceUrl);
  assert.equal(
    jobs[0].companyLogo,
    "https://portal.ajira.go.tz/media/gst-logo.png"
  );
});


test("collectAjiraJobs enriches TASHICO from its verified official homepage", async () => {
  const sourceUrl = getAjiraDetailUrl(13756);
  const calls = [];
  const jobs = await collectAjiraJobs({
    rows: [
      {
        title: "DECK OFFICER II",
        company: "Kampuni ya Meli Tanzania (TASHICO)",
        deadline: "17/10/2026",
        sourceUrl,
      },
    ],
    fetchFn: async (url) => {
      calls.push(url);
      assert.equal(url, "https://www.tashico.co.tz/");
      return {
        ok: true,
        headers: new Headers({ "content-type": "text/html" }),
        text: async () =>
          '<header><img class="site-logo" src="/assets/tashico-logo.png" alt="TASHICO logo"></header>',
      };
    },
  });

  assert.equal(jobs.length, 1);
  assert.deepEqual(calls, ["https://www.tashico.co.tz/"]);
  assert.equal(
    jobs[0].companyLogo,
    "https://www.tashico.co.tz/assets/tashico-logo.png"
  );
});
