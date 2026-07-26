const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildEmailApplicationUrl,
  isDirectApplicationUrl,
} = require("../scraper/lib/applications");

test("email application links prepare the recipient, subject and professional body", () => {
  const value = buildEmailApplicationUrl({
    email: "Recruitment@example.co.tz",
    title: "Credit Analyst",
    company: "Example Bank",
  });
  const url = new URL(value);

  assert.equal(url.pathname, "recruitment@example.co.tz");
  assert.doesNotMatch(value, /\+/);
  assert.equal(
    url.searchParams.get("subject"),
    "Application for Credit Analyst - [Your full name]"
  );
  assert.match(url.searchParams.get("body"), /Dear Hiring Team/);
  assert.match(url.searchParams.get("body"), /I hope you are well/);
  assert.match(url.searchParams.get("body"), /CV and supporting documents attached/);
  assert.match(url.searchParams.get("body"), /Best regards/);
});

test("direct application URL validation rejects unsafe protocols", () => {
  assert.equal(isDirectApplicationUrl("https://careers.example.co.tz/apply/42"), true);
  assert.equal(isDirectApplicationUrl("mailto:jobs@example.co.tz"), true);
  assert.equal(isDirectApplicationUrl("javascript:alert(1)"), false);
});
