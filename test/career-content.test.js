import assert from "node:assert/strict";
import test from "node:test";
import { CAREER_GUIDES, findCareerGuide } from "../lib/career-guides.js";
import { JOB_CATEGORIES } from "../lib/job-categories.js";
import {
  SECTOR_GUIDES,
  findSectorGuide,
  sectorGuideForCategory,
  sectorSlug,
} from "../lib/sector-guides.js";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

test("career guides have unique slugs, substantial text and a Swahili summary", () => {
  assert.ok(CAREER_GUIDES.length >= 10);
  assert.equal(new Set(CAREER_GUIDES.map((guide) => guide.slug)).size, CAREER_GUIDES.length);

  for (const guide of CAREER_GUIDES) {
    assert.match(guide.slug, SLUG, guide.slug);
    assert.ok(guide.title && guide.description, guide.slug);
    const words = guide.sections
      .flatMap((section) => [...(section.paragraphs || []), ...(section.items || [])])
      .join(" ")
      .split(/\s+/).length;
    assert.ok(words >= 350, `${guide.slug} has only ${words} words`);
    assert.equal(guide.sections.at(-1).heading, "Kwa Kiswahili", guide.slug);
    assert.equal(findCareerGuide(guide.slug), guide);
  }
  assert.equal(findCareerGuide("missing"), null);
});

test("sector guides cover every public category except General", () => {
  const expected = JOB_CATEGORIES.filter((category) => category !== "General");
  assert.deepEqual(SECTOR_GUIDES.map((sector) => sector.category), expected);
  assert.equal(new Set(SECTOR_GUIDES.map((sector) => sector.slug)).size, SECTOR_GUIDES.length);

  for (const sector of SECTOR_GUIDES) {
    assert.match(sector.slug, SLUG, sector.slug);
    assert.ok(sector.intro.length >= 2, sector.slug);
    assert.ok(sector.tips.length >= 3, sector.slug);
    for (const slug of sector.guides) {
      assert.ok(findCareerGuide(slug), `${sector.slug} links unknown guide ${slug}`);
    }
    assert.equal(findSectorGuide(sector.slug), sector);
    assert.equal(sectorGuideForCategory(sector.category), sector);
  }
});

test("sector slugs are readable and stable", () => {
  assert.equal(sectorSlug("Banking & Finance"), "banking-and-finance");
  assert.equal(sectorSlug("Mining, Energy, Oil & Gas"), "mining-energy-oil-and-gas");
  assert.equal(sectorGuideForCategory("General"), null);
});
