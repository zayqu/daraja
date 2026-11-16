const test = require("node:test");
const assert = require("node:assert/strict");
const { collectDiscoveryFeedJobs, parseDiscoveryFeed, officialLinkFrom } = require("../scraper/sources/discovery-feed");
const { prepareVerifiedVacancies } = require("../scraper/lib/verified-publication");
const { decidePublication } = require("../scraper/lib/job-policy");
const SOURCE = require("../scraper/config/source-catalog.json").sources.find(s => s.id === "fursa-tanzania");
const NOW = new Date("2026-11-16T12:00:00Z");
function item({ title = "Digital Marketing Professional Job Vacancy at SBC Tanzania Limited", company = "SBC Tanzania Limited", location = "Dar es Salaam, Tanzania", url = "https://fursa.co.tz/job/sbc-marketing/", content = '<p>Application Deadline: 19th November 2026</p><a href="mailto:sbc-recruitment@sbc.co.tz">Apply</a>' } = {}) {
  return `<item><title>${title}</title><link>${url}</link><job_listing:company>${company}</job_listing:company><job_listing:location>${location}</job_listing:location><job_listing:job_type>Full Time</job_listing:job_type><content:encoded><![CDATA[${content}]]></content:encoded></item>`;
}
function feed(items) { return `<rss xmlns:job_listing="https://wpjobmanager.com" xmlns:content="http://purl.org/rss/1.0/modules/content/"><channel>${items}</channel></rss>`; }
function parse(xml, source = SOURCE) { return parseDiscoveryFeed(xml, source, { now: NOW }); }
test("SBC-style email vacancy retains position, employer, source and deadline for review", () => {
  const [job] = parse(feed(item()));
  assert.equal(job.title, "Digital Marketing Professional");
  assert.equal(job.company, "SBC Tanzania Limited");
  assert.equal(job.applicationUrl, "mailto:sbc-recruitment@sbc.co.tz");
  assert.equal(job.sourceUrl, "https://fursa.co.tz/job/sbc-marketing/");
  assert.equal(job.deadline.toISOString().slice(0, 10), "2026-11-19");
  assert.equal(job.type, "FULL_TIME");
  assert.match(job.description, /administrator must verify/);
  const prepared = prepareVerifiedVacancies([job], NOW);
  assert.equal(prepared.held.length, 1);
  assert.equal(decidePublication(prepared.jobs[0], SOURCE.id).status, "PENDING_REVIEW");
  assert.equal(job.originalEvidence, null);
});
test("discovery preserves no-deadline leads without inventing a date or full copied description", () => {
  const [job] = parse(feed(item({content:'<p>A lengthy original employer description that must not be copied into a public job.</p>'})));
  assert.equal(job.deadline, null);
  assert.equal(job.applicationUrl, null);
  assert.doesNotMatch(job.description, /lengthy original/);
  assert.equal(decidePublication(job, SOURCE.id).status, "PENDING_REVIEW");
});
test("expired, non-vacancy, missing employer, foreign and off-board records are excluded", () => {
  const result = parse(feed([
    item({content:'Application Deadline: 12 November 2026'}),
    item({title:'Names Called for Interview'}), item({company:''}),
    item({location:'Lagos, Nigeria'}), item({url:'https://elsewhere.example/job/x'}),
  ].join('')));
  assert.equal(result.length, 0);
  assert.equal(result.health.skipped, 5);
  assert.equal(result.health.preserveExisting, true);
  assert.equal(result.health.archiveEmptySnapshot, false);
});
test("duplicate feed items retain a stable source identity and bounded item count", () => {
  const xml = feed(item()+item());
  assert.equal(parse(xml).length, 1);
  assert.equal(parse(xml)[0].sourceId, parse(xml)[0].sourceId);
  assert.equal(parse(xml,{...SOURCE,feed:{...SOURCE.feed,maxItems:1}}).health.discovered,1);
});
test("payment-risk wording remains visible to existing scam rejection", () => {
  const [job] = parse(feed(item({content:'<p>Applicants must pay application fee TZS 5000.</p>'})));
  assert.equal(decidePublication(job,SOURCE.id).status, 'REJECTED');
});
test("application candidates reject private destinations, credentials, scripts and social links", () => {
  const base='https://fursa.co.tz/job/x/';
  for (const href of ['https://127.0.0.1/apply','https://[::1]/apply','https://172.16.2.3/apply','https://user:password@example.com/apply','javascript:alert(1)','https://wa.me/123']) {
    assert.equal(officialLinkFrom(`<a href="${href}">Apply</a>`,base),null);
  }
  assert.equal(officialLinkFrom('<a href="https://jobs.lever.co/company/123">Apply</a>',base),'https://jobs.lever.co/company/123');
});
test("collector performs only one bounded same-host feed read and never visits candidate links", async () => {
  const calls=[];
  const jobs = await collectDiscoveryFeedJobs(SOURCE,{now:NOW,fetchFn:async(url,options)=>{calls.push({url,options}); return {ok:true,text:async()=>feed(item())};}});
  assert.equal(calls.length,1);
  assert.equal(calls[0].url,SOURCE.feed.url);
  assert.equal(calls[0].options.redirect,'error');
  assert.equal(jobs.length,1);
  await assert.rejects(collectDiscoveryFeedJobs({...SOURCE,feed:{url:'https://evil.example/feed'}},{fetchFn:()=>{throw Error('must not fetch');}}),/configured public HTTPS/);
});
test("blocked, malformed or oversized feeds report failure instead of a healthy empty snapshot", async () => {
  assert.throws(()=>parse('<html>Access denied</html>'),/not an RSS/);
  await assert.rejects(collectDiscoveryFeedJobs(SOURCE,{fetchFn:async()=>({ok:false,status:403})}),/HTTP 403/);
  await assert.rejects(collectDiscoveryFeedJobs(SOURCE,{fetchFn:async()=>({ok:true,text:async()=>'x'.repeat(2000001)})}),/size limit/);
});
