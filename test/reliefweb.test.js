const test = require("node:test");
const assert = require("node:assert/strict");

const { parseReliefWebPage } = require("../scraper/sources/reliefweb");

test("parseReliefWebPage extracts complete Tanzania vacancies only", () => {
  const html = `
    <article class="rw-river-article--job">
      <p class="rw-entity-country-slug">Tanzania</p>
      <h3 class="rw-river-article__title">
        <a href="https://reliefweb.int/job/42/example-role">Example Role</a>
      </h3>
      <dd class="rw-entity-meta__tag-value--source">Example NGO</dd>
      <dd class="rw-entity-meta__tag-value--closing-date">
        <time datetime="2099-08-03T00:00:00+00:00">3 Aug 2099</time>
      </dd>
    </article>
    <article class="rw-river-article--job">
      <p class="rw-entity-country-slug">Kenya</p>
      <h3 class="rw-river-article__title">
        <a href="https://reliefweb.int/job/43/wrong-country">Wrong Country</a>
      </h3>
      <dd class="rw-entity-meta__tag-value--source">Other NGO</dd>
      <dd class="rw-entity-meta__tag-value--closing-date">
        <time datetime="2099-08-03T00:00:00+00:00">3 Aug 2099</time>
      </dd>
    </article>`;

  const jobs = parseReliefWebPage(html);
  assert.equal(jobs.length, 1);
  assert.equal(jobs[0].title, "Example Role");
  assert.equal(jobs[0].company, "Example NGO");
  assert.equal(jobs[0].deadline, "2099-08-03T00:00:00+00:00");
});
