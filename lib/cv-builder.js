const MAX_ITEMS = 20;
const MAX_BULLETS = 8;

export const CV_SECTION_ORDER = [
  "summary",
  "experience",
  "education",
  "skills",
  "certifications",
  "trainings",
  "projects",
  "languages",
  "references",
];

export const DEFAULT_CV_THEME = {
  template: "modern",
  accent: "#1b2a3f",
  fontFamily: "Arial",
  density: "comfortable",
  headerAlign: "left",
  headerStyle: "clean",
  headingStyle: "line",
  bulletStyle: "disc",
  contactStyle: "dots",
  nameScale: "balanced",
  pageMargin: "standard",
  sectionOrder: CV_SECTION_ORDER,
};

const clean = (value, max = 500) =>
  typeof value === "string"
    ? value.replace(/\s+/g, " ").trim().slice(0, max)
    : "";

const cleanMultiline = (value, max = 2_000) =>
  typeof value === "string"
    ? value.replace(/\r/g, "").trim().slice(0, max)
    : "";

const list = (value, limit = MAX_ITEMS) =>
  Array.isArray(value) ? value.slice(0, limit) : [];

function normalizeStrings(value, limit = MAX_ITEMS, max = 120) {
  return list(value, limit).map((item) => clean(item, max)).filter(Boolean);
}

function normalizeExperience(value) {
  return list(value).map((item = {}) => ({
    role: clean(item.role, 140),
    employer: clean(item.employer, 180),
    location: clean(item.location, 120),
    startDate: clean(item.startDate, 30),
    endDate: clean(item.endDate, 30),
    current: Boolean(item.current),
    bullets: normalizeStrings(item.bullets, MAX_BULLETS, 320),
  }));
}

function normalizeEducation(value) {
  return list(value).map((item = {}) => ({
    qualification: clean(item.qualification, 180),
    institution: clean(item.institution, 180),
    location: clean(item.location, 120),
    startYear: clean(item.startYear, 20),
    endYear: clean(item.endYear, 20),
    details: cleanMultiline(item.details, 600),
  }));
}

function normalizeNamedRecords(value, { detailKey = "issuer", detailMax = 180 } = {}) {
  return list(value).map((item = {}) => ({
    name: clean(item.name, 180),
    [detailKey]: clean(item[detailKey], detailMax),
    year: clean(item.year, 20),
  }));
}

function normalizeProjects(value) {
  return list(value).map((item = {}) => ({
    name: clean(item.name, 180),
    description: cleanMultiline(item.description, 700),
    link: clean(item.link, 300),
  }));
}

function normalizeLanguages(value) {
  return list(value).map((item = {}) => ({
    name: clean(item.name, 80),
    level: clean(item.level, 80),
  }));
}

function normalizeReferences(value) {
  return list(value, 6).map((item = {}) => ({
    name: clean(item.name, 160),
    title: clean(item.title, 160),
    organisation: clean(item.organisation, 180),
    phone: clean(item.phone, 60),
    email: clean(item.email, 180),
  }));
}

export function buildInitialCvContent(profile = {}, user = {}) {
  return {
    personal: {
      fullName: clean(profile.fullName || user.name || "", 160),
      headline: clean(profile.headline || "", 180),
      email: clean(user.email || "", 180),
      phone: clean(profile.phone || "", 60),
      location: clean(profile.location || "", 140),
      postalAddress: "",
      linkedIn: "",
      portfolio: clean(profile.portfolioUrl || "", 300),
    },
    summary: "",
    experience: [],
    education: [],
    skills: [],
    certifications: [],
    trainings: [],
    projects: [],
    languages: [],
    references: [],
  };
}

export function normalizeCvContent(value = {}, fallback = {}) {
  const personal = value?.personal || {};
  const fallbackPersonal = fallback?.personal || {};

  return {
    personal: {
      fullName: clean(personal.fullName || fallbackPersonal.fullName, 160),
      headline: clean(personal.headline || fallbackPersonal.headline, 180),
      email: clean(personal.email || fallbackPersonal.email, 180),
      phone: clean(personal.phone || fallbackPersonal.phone, 60),
      location: clean(personal.location || fallbackPersonal.location, 140),
      postalAddress: clean(personal.postalAddress, 220),
      linkedIn: clean(personal.linkedIn, 300),
      portfolio: clean(personal.portfolio || fallbackPersonal.portfolio, 300),
    },
    summary: cleanMultiline(value.summary, 1_500),
    experience: normalizeExperience(value.experience),
    education: normalizeEducation(value.education),
    skills: normalizeStrings(value.skills, 40, 100),
    certifications: normalizeNamedRecords(value.certifications),
    trainings: normalizeNamedRecords(value.trainings, {
      detailKey: "provider",
    }),
    projects: normalizeProjects(value.projects),
    languages: normalizeLanguages(value.languages),
    references: normalizeReferences(value.references),
  };
}

export function normalizeCvTheme(value = {}) {
  const templates = new Set(["modern", "classic", "minimal", "executive", "public"]);
  const fonts = new Set([
    "Arial",
    "Georgia",
    "Times New Roman",
    "Trebuchet MS",
    "Verdana",
    "Tahoma",
  ]);
  const densities = new Set(["compact", "comfortable", "spacious"]);
  const aligns = new Set(["left", "center"]);
  const headerStyles = new Set(["clean", "rule", "accent"]);
  const headingStyles = new Set(["line", "plain", "caps", "accent"]);
  const bulletStyles = new Set(["disc", "square", "dash"]);
  const contactStyles = new Set(["dots", "pipes", "lines"]);
  const nameScales = new Set(["compact", "balanced", "prominent"]);
  const pageMargins = new Set(["narrow", "standard", "wide"]);

  const accent =
    typeof value.accent === "string" && /^#[0-9a-f]{6}$/i.test(value.accent)
      ? value.accent
      : DEFAULT_CV_THEME.accent;

  const requestedOrder = Array.isArray(value.sectionOrder)
    ? value.sectionOrder.filter((key) => CV_SECTION_ORDER.includes(key))
    : [];
  const sectionOrder = [
    ...new Set([...requestedOrder, ...CV_SECTION_ORDER]),
  ];

  return {
    template: templates.has(value.template) ? value.template : DEFAULT_CV_THEME.template,
    accent,
    fontFamily: fonts.has(value.fontFamily) ? value.fontFamily : DEFAULT_CV_THEME.fontFamily,
    density: densities.has(value.density) ? value.density : DEFAULT_CV_THEME.density,
    headerAlign: aligns.has(value.headerAlign) ? value.headerAlign : DEFAULT_CV_THEME.headerAlign,
    headerStyle: headerStyles.has(value.headerStyle)
      ? value.headerStyle
      : DEFAULT_CV_THEME.headerStyle,
    headingStyle: headingStyles.has(value.headingStyle)
      ? value.headingStyle
      : DEFAULT_CV_THEME.headingStyle,
    bulletStyle: bulletStyles.has(value.bulletStyle)
      ? value.bulletStyle
      : DEFAULT_CV_THEME.bulletStyle,
    contactStyle: contactStyles.has(value.contactStyle)
      ? value.contactStyle
      : DEFAULT_CV_THEME.contactStyle,
    nameScale: nameScales.has(value.nameScale)
      ? value.nameScale
      : DEFAULT_CV_THEME.nameScale,
    pageMargin: pageMargins.has(value.pageMargin)
      ? value.pageMargin
      : DEFAULT_CV_THEME.pageMargin,
    sectionOrder,
  };
}

const STOP_WORDS = new Set([
  "and", "the", "with", "for", "from", "that", "this", "your", "you", "our",
  "will", "are", "job", "role", "work", "have", "has", "into", "their", "about",
  "was", "were", "who", "all", "any", "not", "but", "can", "must", "required",
  "preferred", "position", "candidate", "applicant", "experience", "skills",
]);

function keywordSet(text) {
  const words = String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9+#.\-\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 4 && !STOP_WORDS.has(word));

  const counts = new Map();
  for (const word of words) counts.set(word, (counts.get(word) || 0) + 1);

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([word]) => word);
}

function cvSearchText(content) {
  return [
    content.personal?.headline,
    content.summary,
    ...content.skills,
    ...content.experience.flatMap((item) => [
      item.role,
      item.employer,
      ...item.bullets,
    ]),
    ...content.education.flatMap((item) => [
      item.qualification,
      item.institution,
      item.details,
    ]),
    ...content.certifications.map((item) => item.name),
    ...content.trainings.map((item) => item.name),
    ...content.projects.flatMap((item) => [item.name, item.description]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function jobMatch(content, job) {
  if (!job) return { score: null, matched: [], missing: [] };
  const keywords = keywordSet(
    [job.title, job.description, job.category, job.company].filter(Boolean).join(" ")
  );
  if (!keywords.length) return { score: null, matched: [], missing: [] };

  const haystack = cvSearchText(content);
  const matched = keywords.filter((word) => haystack.includes(word));
  const missing = keywords.filter((word) => !haystack.includes(word)).slice(0, 10);

  return {
    score: Math.round((matched.length / keywords.length) * 100),
    matched,
    missing,
  };
}

export function scoreCandidateCv(content, { mode = "GENERAL", job = null } = {}) {
  let score = 0;
  const suggestions = [];
  const personal = content.personal || {};

  const contacts = [personal.email, personal.phone, personal.location].filter(Boolean).length;
  score += personal.fullName ? 5 : 0;
  score += Math.min(contacts * 3, 9);
  if (!personal.phone) suggestions.push("Add a reliable phone number.");
  if (!personal.email) suggestions.push("Add a professional email address.");
  if (!personal.location) suggestions.push("Add your current location.");

  if (content.summary?.length >= 60) score += 10;
  else suggestions.push("Add a focused 3–5 line professional summary.");

  if (content.experience.length) {
    score += 8;
    const completeExperience = content.experience.filter(
      (item) => item.role && item.employer && item.startDate && (item.current || item.endDate)
    ).length;
    score += Math.min(completeExperience * 3, 9);

    const bullets = content.experience.flatMap((item) => item.bullets);
    const strongBullets = bullets.filter((bullet) =>
      /\b(increased|reduced|improved|delivered|managed|led|built|created|saved|grew|achieved|supported|coordinated|implemented)\b/i.test(
        bullet
      )
    ).length;
    if (bullets.length >= 2) score += 3;
    if (strongBullets >= 1) score += 3;
    if (!bullets.some((bullet) => /\d/.test(bullet))) {
      suggestions.push(
        "Where truthful, add measurable results such as amounts, percentages, volumes or time saved."
      );
    }
  } else {
    suggestions.push(
      "Add relevant work, internship, volunteer or project experience."
    );
  }

  if (content.education.some((item) => item.qualification && item.institution)) score += 14;
  else suggestions.push("Add your education and recognised qualifications.");

  if (content.skills.length >= 6) score += 12;
  else if (content.skills.length >= 3) score += 7;
  else suggestions.push("Add 6–12 role-relevant skills supported by your experience.");

  const supportingSections =
    (content.certifications.length ? 1 : 0) +
    (content.trainings.length ? 1 : 0) +
    (content.languages.length ? 1 : 0) +
    (content.projects.length ? 1 : 0);
  score += Math.min(supportingSections * 2, 6);

  if (mode === "PUBLIC_SERVICE") {
    if (personal.postalAddress) score += 3;
    else suggestions.push("Public-service CV: add a postal address/postcode.");

    if (content.references.length >= 3) score += 5;
    else suggestions.push("Public-service CV: add three reputable referees with reliable contacts.");

    if (!content.trainings.length && !content.certifications.length) {
      suggestions.push(
        "Public-service CV: include relevant professional qualifications or trainings where applicable."
      );
    }
  } else {
    score += 8;
  }

  const match = jobMatch(content, job);
  if (match.score !== null) {
    const matchContribution = Math.round((match.score / 100) * 8);
    score += matchContribution;
    if (match.score < 55) {
      suggestions.push(
        "This CV does not yet reflect enough of the selected vacancy language. Add only missing keywords that are genuinely supported by your background."
      );
    }
  } else {
    score += 4;
  }

  return {
    score: Math.min(100, Math.max(0, score)),
    matchScore: match.score,
    matchedKeywords: match.matched,
    missingKeywords: match.missing,
    suggestions: [...new Set(suggestions)].slice(0, 8),
  };
}
