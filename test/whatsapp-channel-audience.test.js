const test = require("node:test");
const assert = require("node:assert/strict");
const {
  CHANNEL_URL,
  SNAPSHOT_KEY,
  parsePublicAudience,
  verifiedPublicAudience,
  syncPublicAudience,
} = require("../lib/whatsapp-channel-audience.cjs");

function database(start) {
  let value = start;
  let writes = 0;
  return {
    get writes() { return writes; },
    get value() { return value; },
    siteSetting: {
      async findUnique({ where }) {
        assert.equal(where.key, SNAPSHOT_KEY);
        return value ? { value } : null;
      },
      async upsert({ where, create, update }) {
        assert.equal(where.key, SNAPSHOT_KEY);
        value = value ? update.value : create.value;
        writes++;
      },
    },
  };
}

const body = '<html><head><meta name="description" content="Channel • 13K followers"></head><body><h1>DARAJA | KAZI NA FURSA TANZANIA</h1><p>Channel • 13K followers</p></body></html>';

test("extracts rounded public count without claiming it is exact", () => {
  assert.deepEqual(parsePublicAudience(body), { label: "13K" });
  assert.equal(parsePublicAudience(body.replace("DARAJA", "OTHER")), null);
  assert.equal(parsePublicAudience("Channel • 13K followers"), null);
  assert.equal(parsePublicAudience(body.replace("13K", "not-a-number")), null);
});

test("recognizes a verified snapshot only within seven days", () => {
  const t = Date.parse("2026-11-13T12:00:00Z");
  const snapshot = { label: "13K", source: CHANNEL_URL, verifiedAt: new Date(t).toISOString() };
  assert.equal(verifiedPublicAudience(snapshot, t)?.label, "13K");
  assert.equal(verifiedPublicAudience(snapshot, t + 8 * 86400_000), null);
  assert.equal(verifiedPublicAudience({ ...snapshot, source: "https://example.com" }, t), null);
});

test("sync is disabled unless explicitly enabled", async () => {
  const previous = process.env.WHATSAPP_CHANNEL_SYNC_ENABLED;
  delete process.env.WHATSAPP_CHANNEL_SYNC_ENABLED;
  try {
    const db = database(null);
    assert.deepEqual(await syncPublicAudience(db), { status: "disabled" });
    assert.equal(db.writes, 0);
  } finally {
    if (previous === undefined) delete process.env.WHATSAPP_CHANNEL_SYNC_ENABLED;
    else process.env.WHATSAPP_CHANNEL_SYNC_ENABLED = previous;
  }
});

test("sync stores rounded snapshot, limits refresh frequency, and retains it on failures", async () => {
  const previous = process.env.WHATSAPP_CHANNEL_SYNC_ENABLED;
  process.env.WHATSAPP_CHANNEL_SYNC_ENABLED = "true";
  try {
    const db = database(null);
    const t = new Date("2026-11-13T12:00:00Z");
    const fetcher = async () => ({
      ok: true,
      url: CHANNEL_URL,
      headers: { get: () => null },
      text: async () => body,
    });
    assert.equal((await syncPublicAudience(db, { now: t, fetcher })).status, "updated");
    assert.equal(db.value.label, "13K");
    assert.equal(db.value.verifiedAt, t.toISOString());
    assert.equal((await syncPublicAudience(db, { now: new Date(t.getTime() + 3600_000), fetcher })).status, "skipped");
    assert.equal(db.writes, 1);
    const failed = await syncPublicAudience(db, {
      now: new Date(t.getTime() + 86400_000),
      fetcher: async () => { throw new Error("offline"); },
    });
    assert.equal(failed.status, "unavailable");
    assert.equal(db.value.label, "13K");
    assert.equal(db.value.verifiedAt, t.toISOString());
  } finally {
    if (previous === undefined) delete process.env.WHATSAPP_CHANNEL_SYNC_ENABLED;
    else process.env.WHATSAPP_CHANNEL_SYNC_ENABLED = previous;
  }
});
