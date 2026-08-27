const test = require("node:test");
const assert = require("node:assert/strict");

test("application resolver chooses the final apply CTA instead of a description link", async () => {
  const { extractFinalApplicationUrl } = await import("../lib/application-target.js");
  const html = `
    <main>
      <a href="/vacancy/123">View vacancy details</a>
      <a href="/login">Login</a>
      <section>
        <a href="https://careers.example.co.tz/apply/123">Apply Now</a>
      </section>
    </main>
  `;

  assert.equal(
    extractFinalApplicationUrl(html, "https://careers.example.co.tz/vacancy/123"),
    "https://careers.example.co.tz/apply/123"
  );
});

test("application resolver can return login when authentication is required", async () => {
  const { extractFinalApplicationUrl } = await import("../lib/application-target.js");
  const html = `
    <main>
      <p>You must sign in before applying.</p>
      <a href="/auth/login">Login to Apply</a>
    </main>
  `;

  assert.equal(
    extractFinalApplicationUrl(html, "https://jobs.example.co.tz/vacancy/456"),
    "https://jobs.example.co.tz/auth/login"
  );
});

test("application resolver rejects private and local network targets", async () => {
  const { isSafePublicHttpUrl } = await import("../lib/application-target.js");
  assert.equal(isSafePublicHttpUrl("http://127.0.0.1:3000/apply"), false);
  assert.equal(isSafePublicHttpUrl("http://192.168.1.10/apply"), false);
  assert.equal(isSafePublicHttpUrl("http://[::1]/apply"), false);
  assert.equal(isSafePublicHttpUrl("https://user:pass@careers.example.co.tz/apply"), false);
  assert.equal(isSafePublicHttpUrl("https://careers.example.co.tz/apply"), true);
});

test("ATS recognition cannot be spoofed by a lookalike hostname", async () => {
  const { isLikelyDirectApplicationUrl } = await import("../lib/application-target.js");
  assert.equal(
    isLikelyDirectApplicationUrl("https://jobs.smartrecruiters.com/Company/Role"),
    true
  );
  assert.equal(
    isLikelyDirectApplicationUrl("https://jobs.smartrecruiters.com.evil.test/vacancy/1"),
    false
  );
});

test("server-side resolution is limited to exact source-owned HTTPS hosts", async () => {
  const { isAllowedResolverUrl } = await import("../lib/application-target.js");
  assert.equal(
    isAllowedResolverUrl("ajira", "https://portal.ajira.go.tz/view-advert/123"),
    true
  );
  assert.equal(
    isAllowedResolverUrl("ajira", "https://portal.ajira.go.tz.evil.test/view-advert/123"),
    false
  );
  assert.equal(
    isAllowedResolverUrl("ajiraweb", "https://careers.example.co.tz/jobs/42"),
    false
  );
});

test("server-side resolution validates every redirect before following it", async () => {
  const { fetchAllowedApplicationPage } = await import("../lib/application-target.js");
  let requests = 0;
  const fetchFn = async (_url, options) => {
    requests += 1;
    assert.equal(options.redirect, "manual");
    return new Response(null, {
      status: 302,
      headers: { Location: "http://127.0.0.1/internal" },
    });
  };

  await assert.rejects(
    fetchAllowedApplicationPage({
      source: "ajira",
      url: "https://portal.ajira.go.tz/view-advert/123",
      fetchFn,
    }),
    /not allowlisted/
  );
  assert.equal(requests, 1);
});

test("application page bodies are bounded even without content-length", async () => {
  const { readBoundedApplicationHtml } = await import("../lib/application-target.js");
  const response = new Response("x".repeat(32));
  await assert.rejects(
    readBoundedApplicationHtml(response, 16),
    /response-size limit/
  );
});
