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
      },
    ],
  });

  assert.equal(jobs.length, 1);
  assert.equal(jobs[0].sourceId, "13755");
  assert.equal(jobs[0].title, "ARTISAN II (MINERAL LABORATORY)");
  assert.equal(jobs[0].company, "Geological Survey of Tanzania");
  assert.equal(jobs[0].deadline.toISOString(), "2027-08-06T23:59:59.000Z");
  assert.equal(jobs[0].sourceUrl, sourceUrl);
});
