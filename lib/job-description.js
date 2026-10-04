// Turns a vacancy's source text into professional sections without inventing
// anything: it only regroups, de-duplicates and splits what the source says.
// English and Swahili headings are recognised. Text that has no recognisable
// headings is returned as a single "About the role" section.

const SECTIONS = [
  {
    id: "summary",
    title: "Role summary",
    heading:
      "(?:job|position|role)\\s+(?:summary|purpose|overview|description|profile)|overview\\s+of\\s+the\\s+role|purpose\\s+of\\s+the\\s+(?:job|role|position)|job\\s+purpose|muhtasari(?:\\s+wa\\s+kazi)?|lengo\\s+la\\s+kazi",
  },
  {
    id: "responsibilities",
    title: "What you'll do",
    heading:
      "(?:key\\s+|main\\s+|major\\s+|specific\\s+|core\\s+)?(?:duties(?:\\s+(?:and|&)\\s+responsibilities)?|responsibilities(?:\\s+(?:and|&)\\s+duties)?|accountabilities|tasks)|what\\s+you(?:'|’)?ll\\s+do|what\\s+you\\s+will\\s+do|the\\s+role|majukumu(?:\\s+ya\\s+kazi)?|kazi\\s+za\\s+kufanya",
  },
  {
    id: "requirements",
    title: "What you need",
    heading:
      "(?:minimum\\s+|required\\s+|key\\s+)?(?:qualifications(?:\\s+(?:and|&)\\s+(?:experience|skills))?|requirements|education(?:\\s+(?:and|&)\\s+experience)?|experience(?:\\s+(?:and|&)\\s+(?:qualifications|skills))?|skills(?:\\s+(?:and|&)\\s+(?:competencies|experience|abilities))?|competencies)|who\\s+you\\s+are|what\\s+you\\s+need|person\\s+specification|candidate\\s+profile|sifa\\s+za\\s+m(?:w|u)?ombaji|sifa\\s+za\\s+kuajiriwa|sifa|vigezo",
  },
  {
    id: "preferred",
    title: "Nice to have",
    heading:
      "desirable(?:\\s+(?:qualifications|skills))?|preferred(?:\\s+(?:qualifications|skills))?|nice\\s+to\\s+have|(?:an\\s+)?added\\s+advantage",
  },
  {
    id: "benefits",
    title: "What we offer",
    heading:
      "benefits|what\\s+we\\s+offer|remuneration(?:\\s+(?:and|&)\\s+benefits)?|compensation(?:\\s+(?:and|&)\\s+benefits)?|salary(?:\\s+(?:and|&)\\s+benefits)?|perks|maslahi|mshahara",
  },
  {
    id: "about",
    title: "About the employer",
    heading:
      "about\\s+(?:the\\s+)?(?:company|organi[sz]ation|employer|us|the\\s+bank|the\\s+institution)|company\\s+(?:overview|profile|background|description)|background|who\\s+we\\s+are|kuhusu(?:\\s+\\w+)?",
  },
  {
    id: "apply",
    title: "How to apply",
    heading:
      "how\\s+to\\s+apply|application\\s+(?:process|procedure|instructions|guidelines)|mode\\s+of\\s+application|to\\s+apply|jinsi\\s+ya\\s+kuomba|namna\\s+ya\\s+kutuma\\s+maombi|maombi\\s+yatumwe",
  },
];

const ORDER = ["summary", "responsibilities", "requirements", "preferred", "benefits", "about", "apply"];
const LIST_SECTIONS = new Set(["responsibilities", "requirements", "preferred", "benefits"]);
const HEADING_ALTERNATION = SECTIONS.map((section) => `(?:${section.heading})`).join("|");
const STANDALONE_HEADING = new RegExp(`^(?:${HEADING_ALTERNATION})\\s*[:.\\-–—]?$`, "i");
const INLINE_HEADING = new RegExp(`(^|[.!?)\\s])((?:${HEADING_ALTERNATION}))\\s*:\\s*`, "gi");
const BULLET = /^(?:[-•*·▪●◦–]\s*|\(?\d{1,2}[.)]\s+|\(?[a-z][.)]\s+|\(?(?:i{1,3}|iv|v|vi{0,3})[.)]\s+)/i;

function sectionFor(heading) {
  const text = heading.trim();
  return SECTIONS.find((section) =>
    new RegExp(`^(?:${section.heading})$`, "i").test(text)
  );
}

function normalize(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

// Splits glued sentences ("energy.We employ") and inline headings onto lines.
function toLines(text) {
  const prepared = String(text || "")
    .replace(/\r\n?/g, "\n")
    .replace(/([a-z0-9)])\.([A-Z])/g, "$1.\n$2")
    .replace(INLINE_HEADING, (match, before, heading) => `${before}\n${heading}:\n`);
  return prepared
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function splitSentences(paragraph) {
  return paragraph
    .split(/(?<=[.!?;])\s+(?=[A-Z0-9])/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 2);
}

function finishSection(section) {
  const seen = new Set();
  const unique = (values) =>
    values.filter((value) => {
      const key = normalize(value);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  if (LIST_SECTIONS.has(section.id)) {
    const items = [];
    for (const line of section.lines) {
      if (BULLET.test(line)) items.push(line.replace(BULLET, "").trim());
      else items.push(...splitSentences(line));
    }
    return { id: section.id, title: section.title, items: unique(items), paragraphs: [] };
  }

  const items = section.lines.filter((line) => BULLET.test(line)).map((line) => line.replace(BULLET, "").trim());
  const paragraphs = section.lines.filter((line) => !BULLET.test(line));
  return {
    id: section.id,
    title: section.title,
    items: unique(items),
    paragraphs: unique(paragraphs),
  };
}

export function structureJobDescription(text, { company = "" } = {}) {
  const lines = toLines(text);
  const sections = new Map();
  const preamble = [];
  let current = null;

  for (const line of lines) {
    const heading = line.replace(/\s*[:.\-–—]$/, "");
    const match = STANDALONE_HEADING.test(line) && heading.length <= 70 ? sectionFor(heading) : null;
    if (match) {
      current = sections.get(match.id) || { ...match, lines: [] };
      sections.set(match.id, current);
      continue;
    }
    if (current) current.lines.push(line);
    else preamble.push(line);
  }

  if (!sections.size) {
    const only = finishSection({ id: "role", title: "About the role", lines: preamble });
    return only.items.length || only.paragraphs.length ? [only] : [];
  }

  if (preamble.length) {
    const companyWord = normalize(company).split(" ")[0];
    const preambleText = normalize(preamble.join(" "));
    const aboutEmployer =
      /\b(?:we|our|us)\b/.test(preambleText) ||
      (companyWord && companyWord.length > 2 && preambleText.startsWith(companyWord));
    const target = aboutEmployer && !sections.has("about") ? "about" : !sections.has("summary") ? "summary" : "about";
    const definition = SECTIONS.find((section) => section.id === target);
    const existing = sections.get(target) || { ...definition, lines: [] };
    existing.lines = [...preamble, ...existing.lines];
    sections.set(target, existing);
  }

  return ORDER.filter((id) => sections.has(id))
    .map((id) => finishSection(sections.get(id)))
    .filter((section) => section.items.length || section.paragraphs.length);
}
