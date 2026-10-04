// Turns a vacancy description (scraped or employer-written) into consistent,
// professional sections. It only reorganises the source text: nothing is
// invented, and lines repeated across the source are shown once.

export const SECTION_ORDER = [
  ["overview", "Role overview"],
  ["responsibilities", "Key responsibilities"],
  ["requirements", "Requirements"],
  ["preferred", "Added advantage"],
  ["benefits", "What the employer offers"],
  ["about", "About the employer"],
  ["howToApply", "How to apply"],
];

const LIST_SECTIONS = new Set([
  "responsibilities",
  "requirements",
  "preferred",
  "benefits",
]);

const HEADINGS = [
  ["howToApply", [
    "how to apply", "application process", "application procedure",
    "application instructions", "to apply", "mode of application",
    "method of application", "jinsi ya kuomba", "namna ya kuomba",
    "namna ya kutuma maombi", "utaratibu wa kutuma maombi",
  ]],
  ["preferred", [
    "preferred qualifications", "preferred skills", "desirable",
    "desirable qualifications", "nice to have", "added advantage",
    "an added advantage", "bonus points", "it would be great if you have",
  ]],
  ["benefits", [
    "benefits", "what we offer", "we offer", "what you will get",
    "what you'll get", "remuneration", "compensation", "compensation and benefits",
    "salary and benefits", "perks", "maslahi", "mshahara",
  ]],
  ["responsibilities", [
    "key responsibilities", "responsibilities", "main responsibilities",
    "duties", "main duties", "duties and responsibilities",
    "roles and responsibilities", "job responsibilities", "key duties",
    "key duties and responsibilities", "what you will do", "what you'll do",
    "key result areas", "key accountabilities", "accountabilities",
    "scope of work", "majukumu", "kazi na majukumu", "majukumu ya kazi",
  ]],
  ["requirements", [
    "requirements", "job requirements", "minimum requirements",
    "qualifications", "minimum qualifications", "required qualifications",
    "qualifications and experience", "education and experience",
    "skills", "key skills", "skills and competencies", "competencies",
    "experience", "education", "what you need", "what we are looking for",
    "what we're looking for", "who you are", "person specification",
    "requirements and qualifications", "sifa", "sifa za mwombaji",
    "sifa za muombaji", "sifa za kitaaluma", "vigezo",
  ]],
  ["about", [
    "about us", "about the company", "about the organisation",
    "about the organization", "who we are", "company overview",
    "company profile", "background", "our company", "kuhusu sisi",
    "kuhusu kampuni",
  ]],
  ["overview", [
    "position overview", "job summary", "role overview", "job purpose",
    "purpose of the role", "purpose of the job", "overview", "the role",
    "about the role", "about the job", "job description", "position summary",
    "summary", "role purpose", "muhtasari", "maelezo ya kazi",
  ]],
];

const HEADING_TO_SECTION = new Map(
  HEADINGS.flatMap(([section, labels]) => labels.map((label) => [label, section]))
);

// Longest labels first so "key duties and responsibilities" wins over "duties".
const INLINE_HEADING = new RegExp(
  `(^|[.!?:]\\s*|\\n)(${[...HEADING_TO_SECTION.keys()]
    .sort((a, b) => b.length - a.length)
    .map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+"))
    .join("|")})\\s*:`,
  "gi"
);

const BULLET = /^(?:[-•·*▪●◦‣–]|\(?\d{1,2}[.)]|\(?[a-z][.)])\s+/i;

function clean(line) {
  return String(line || "").replace(/\s+/g, " ").trim();
}

function headingSection(line) {
  const label = clean(line).replace(/[:.\-–]+$/, "").toLowerCase();
  return label.length <= 60 ? HEADING_TO_SECTION.get(label) || null : null;
}

function splitLines(text) {
  return String(text || "")
    .replace(/\r\n?/g, "\n")
    // "energy.We employ" -> two sentences.
    .replace(/([a-z0-9)])\.([A-Z])/g, "$1. $2")
    // Headings written inline: "...about Jaza here.Position Overview: The ..."
    .replace(INLINE_HEADING, (_, before, label) => `${before.trim() ? before : ""}\n${label}:\n`)
    .replace(/\s+([•▪●◦‣])\s+/g, "\n$1 ")
    .split("\n")
    .map(clean)
    .filter(Boolean);
}

function sentences(text) {
  return clean(text)
    .split(/(?<=[.!?])\s+(?=[A-Z0-9])/)
    .map(clean)
    .filter(Boolean);
}

function normalized(line) {
  return clean(line).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function toItems(lines) {
  const items = [];
  for (const line of lines) {
    const bullet = BULLET.test(line);
    const text = clean(line.replace(BULLET, ""));
    if (!text) continue;
    // Prose inside a list section reads better as one point per sentence.
    if (bullet) items.push(text);
    else items.push(...sentences(text));
  }
  return items;
}

/**
 * @param {string} text raw description
 * @param {{ title?: string }} [options]
 * @returns {{ key: string, title: string, paragraphs?: string[], items?: string[] }[]}
 */
export function structureJobDescription(text, { title = "" } = {}) {
  const buckets = new Map();
  const lines = splitLines(text);
  // Text before the first heading is usually the employer's introduction when
  // the description later names its own role overview.
  const laterOverview = lines.some((line) => headingSection(line) === "overview");
  let current = laterOverview && !headingSection(lines[0] || "") ? "about" : "overview";
  const seen = new Set([normalized(title)]);

  for (const line of lines) {
    const section = headingSection(line);
    if (section) {
      current = section;
      continue;
    }
    const key = normalized(line.replace(BULLET, ""));
    if (!key || seen.has(key)) continue;
    seen.add(key);
    if (!buckets.has(current)) buckets.set(current, []);
    buckets.get(current).push(line);
  }

  return SECTION_ORDER.filter(([key]) => buckets.has(key)).map(([key, label]) => {
    const lines = buckets.get(key);
    return LIST_SECTIONS.has(key)
      ? { key, title: label, items: toItems(lines) }
      : { key, title: label, paragraphs: lines.map((line) => clean(line.replace(BULLET, ""))) };
  });
}
