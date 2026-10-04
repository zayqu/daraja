const test = require("node:test");
const assert = require("node:assert/strict");
const { readFile } = require("node:fs/promises");
const path = require("node:path");

async function source(relative) {
  return readFile(path.join(__dirname, "..", relative), "utf8");
}

test("public navigation prioritizes jobs, freelance, employers and about", async () => {
  const publicNav = await source("components/PublicSiteNav.js");
  const mobileDock = await source("components/ui/MobileDock.js");

  assert.match(publicNav, /label: "Home"/);
  assert.match(publicNav, /label: "Jobs"/);
  assert.match(publicNav, /jobs\?type=FREELANCE/);
  assert.match(publicNav, /label: "Employers"/);
  assert.match(publicNav, /label: "About"/);
  assert.doesNotMatch(publicNav, /label: "Internships"/);

  assert.match(mobileDock, /label: "Freelance"/);
  assert.match(mobileDock, /icon: "freelance"/);
  assert.match(mobileDock, /useSearchParams/);
  assert.match(mobileDock, /searchParams\.get\("type"\) === "FREELANCE"/);
  assert.match(mobileDock, /userRole === "JOB_SEEKER"/);
  assert.match(mobileDock, /userRole === "EMPLOYER"/);
  assert.match(mobileDock, /userRole === "ADMIN"/);
  assert.match(mobileDock, /label: "Career"/);
  assert.match(mobileDock, /label: "Employer"/);
  assert.match(mobileDock, /label: "Admin"/);
  assert.match(mobileDock, /size=\{24\}/);
  assert.match(mobileDock, />\s*Internships\s*</);
  assert.match(mobileDock, />\s*Employer workspace\s*</);
});

test("homepage sends live counters to the navy footer insights", async () => {
  const home = await source("app/page.js");
  const footer = await source("components/SiteFooter.js");
  const footerStyles = await source("components/SiteFooter.module.css");
  const stats = await source("lib/home-stats.js");

  assert.match(home, /await getHomeStats\(\)/);
  assert.match(home, /<SiteFooter stats=\{stats\} \/>/);
  assert.doesNotMatch(home, /className="trust"/);

  assert.match(footer, /stats\.liveJobs/);
  assert.match(footer, /stats\.employers/);
  assert.match(footer, /stats\.sources/);
  assert.match(footer, /VisitorCounter initialCount=\{stats\.visitorsThisMonth\}/);
  assert.match(footer, /Daraja at a glance/);
  assert.match(footerStyles, /background:\s*#1b2a3f/);

  assert.match(stats, /buildPublicJobWhere\("active"/);
  assert.match(stats, /prisma\.job\.count/);
  assert.match(stats, /distinct: \["company"\]/);
  assert.match(stats, /distinct: \["source"\]/);
});

test("hero bridge uses the approved opportunity groups", async () => {
  const bridge = await source("components/HomeHeroBridge.js");

  assert.match(bridge, /Private sector & Institutions/);
  assert.match(bridge, /Government/);
  assert.match(bridge, /Bank & Finance/);
  assert.doesNotMatch(bridge, /NGO & Development/);
});


test("mobile dock follows compact bottom-navigation sizing", async () => {
  const styles = await source("components/ui/MobileDock.module.css");
  const layout = await source("app/layout.js");

  assert.match(styles, /min-height:\s*50px/);
  assert.match(styles, /font-size:\s*0\.68rem/);
  assert.match(styles, /\.active \.iconWrap/);
  assert.match(styles, /background:\s*rgba\(0, 201, 167, 0\.12\)/);
  assert.match(styles, /\.active \.label[\s\S]*font-weight:\s*800/);
  assert.match(layout, /await auth\(\)/);
  assert.match(layout, /userRole=\{userRole\}/);
  assert.match(layout, /<Suspense fallback=\{null\}>[\s\S]*<MobileDock/);
});
