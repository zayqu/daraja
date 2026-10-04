const test = require("node:test");
const assert = require("node:assert/strict");
const { readFile } = require("node:fs/promises");
const path = require("node:path");

async function source(relative) {
  return readFile(path.join(__dirname, "..", relative), "utf8");
}

test("public navigation uses one shared source of truth", async () => {
  const publicNav = await source("components/PublicSiteNav.js");
  const siteNav = await source("components/SiteNav.js");
  const navigation = await source("lib/public-navigation.js");
  const mobileDock = await source("components/ui/MobileDock.js");

  assert.match(publicNav, /buildPublicNavigation/);
  assert.match(siteNav, /const DEFAULT_LINKS = buildPublicNavigation\(\)/);
  assert.match(navigation, /label: "Home"/);
  assert.match(navigation, /label: "Jobs"/);
  assert.match(navigation, /jobs\?type=FREELANCE/);
  assert.match(navigation, /label: "Employers"/);
  assert.match(navigation, /label: "About"/);
  assert.doesNotMatch(navigation, /label: "Internships"/);

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

test("homepage keeps platform counters while shared footer owns public traffic numbers", async () => {
  const home = await source("app/page.js");
  const footer = await source("components/SiteFooter.js");
  const trafficNumbers = await source("components/TrafficNumbers.js");
  const formatter = await source("lib/format-number.js");
  const footerStyles = await source("components/SiteFooter.module.css");
  const stats = await source("lib/home-stats.js");

  assert.match(home, /await getHomeStats\(\)/);
  assert.match(home, /<SiteFooter \/>/);
  assert.match(home, /className="trust"/);
  assert.match(home, /stats\.liveJobs/);
  assert.match(home, /stats\.employers/);
  assert.match(home, /stats\.sources/);
  assert.match(home, /\.trust \{[\s\S]*background:\s*var\(--color-navy\)/);

  assert.match(footer, /<TrafficNumbers className=\{styles\.trafficMeta\} \/>/);
  assert.match(trafficNumbers, /fetch\("\/api\/visitors"/);
  assert.match(trafficNumbers, /traffic\.totalVisits/);
  assert.match(trafficNumbers, /traffic\.newVisitors/);
  assert.match(trafficNumbers, /traffic\.returningVisitors/);
  assert.match(trafficNumbers, /traffic\.pageViews/);
  assert.match(formatter, /suffix: "K"/);
  assert.match(formatter, /suffix: "M"/);
  assert.match(footerStyles, /\.trafficMeta/);

  assert.match(stats, /buildPublicJobWhere\("active"/);
  assert.match(stats, /prisma\.job\.count/);
  assert.match(stats, /distinct: \["company"\]/);
  assert.match(stats, /distinct: \["source"\]/);
  assert.doesNotMatch(stats, /visitorCounter/);
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

test("generic content pages compose shared UI primitives", async () => {
  const contentPage = await source("components/ContentPage.js");

  assert.match(contentPage, /<PageHero/);
  assert.match(contentPage, /<WorkspaceShell/);
  assert.match(contentPage, /<SurfaceCard/);
  assert.match(contentPage, /<PublicSiteNav \/>/);
  assert.match(contentPage, /<SiteFooter \/>/);
});
