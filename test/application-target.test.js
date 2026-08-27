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
  assert.equal(isSafePublicHttpUrl("https://careers.example.co.tz/apply"), true);
});
