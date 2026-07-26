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
  assert.equal(url.searchParams.get("subject"), "Application for Credit Analyst");
  assert.match(url.searchParams.get("body"), /Dear Hiring Manager/);
  assert.match(url.searchParams.get("body"), /CV and application letter attached/);
  assert.match(url.searchParams.get("body"), /Full name/);
});

test("direct application URL validation rejects unsafe protocols", () => {
  assert.equal(isDirectApplicationUrl("https://careers.example.co.tz/apply/42"), true);
  assert.equal(isDirectApplicationUrl("mailto:jobs@example.co.tz"), true);
  assert.equal(isDirectApplicationUrl("javascript:alert(1)"), false);
});
