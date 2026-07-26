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

test("collectAjiraJobs maps the public API response into a valid job", async () => {
  const fetchFn = async () => ({
    ok: true,
    json: async () => ({
      data: {
        getVacancies: [
          {
            id: 13755,
            noOfPost: 4,
            closeDate: "2027-08-06T00:00",
            scheme: {
              codeNo: "ARTISAN II (MINERAL LABORATORY)",
              emp: { name: "Geological Survey of Tanzania" },
            },
          },
        ],
      },
    }),
  });

  const jobs = await collectAjiraJobs({ fetchFn, signal: undefined });

  assert.equal(jobs.length, 1);
  assert.equal(jobs[0].sourceId, "13755");
  assert.equal(jobs[0].title, "ARTISAN II (MINERAL LABORATORY)");
  assert.equal(jobs[0].company, "Geological Survey of Tanzania");
  assert.equal(jobs[0].deadline.toISOString(), "2027-08-06T23:59:59.000Z");
  assert.match(
    jobs[0].sourceUrl,
    /^https:\/\/portal\.ajira\.go\.tz\/view-advert\//
  );
});
