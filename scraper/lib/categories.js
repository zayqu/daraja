const CATEGORIES = [
  "Government",
  "NGO & Development",
  "Banking & Finance",
  "Technology",
  "Creative, Design & Media",
  "Health",
  "Education",
  "Engineering",
  "Sales & Marketing",
  "Accounting & Audit",
  "HR & Administration",
  "Legal",
  "Logistics & Transport",
  "Hospitality & Tourism",
  "Agriculture",
  "Mining, Energy, Oil & Gas",
  "Manufacturing",
  "Construction & Real Estate",
  "Security & Protective Services",
  "Internships & Graduate Programs",
  "General",
];

const RULES = [
  ["Internships & Graduate Programs", /\b(intern(ship)?|graduate trainee|management trainee|volunteer|mafunzo kwa vitendo)\b/i],
  ["Creative, Design & Media", /\b(graphic|designer|creative|art director|copywriter|content creator|photograph|videograph|animator|illustrator|media|journalist|editor|broadcast|ubunifu|mwandishi|mpiga picha)\w*/i],
  ["Technology", /\b(software|developer|programmer|data scientist|data analyst|cyber|information technology|\bit\b|ict|tehama|network|systems? administrator|digital|programu|mifumo ya kompyuta)\b/i],
  ["Health", /\b(doctor|nurse|medical|clinical|pharmac|health|laborator|nutrition|radiolog|dentist|midwi|daktari|tabibu|muuguzi|afya|mfamasia|maabara)\w*/i],
  ["Education", /\b(teacher|lecturer|tutor|professor|education|academic|school|university|research|mwalimu|mhadhiri|mkufunzi|elimu|mtafiti|utafiti)\b/i],
  ["Engineering", /\b(engineer|engineering|architect|surveyor|technician|mechanic|electrician|mhandisi|msanifu|mpima|fundi)\w*/i],
  ["Accounting & Audit", /\b(accountant|accounting|auditor|audit|bookkeep|treasurer|mhasibu|uhasibu|mkaguzi|ukaguzi|hazina)\w*/i],
  ["HR & Administration", /\b(human resources?|\bhr\b|administrat|office manager|receptionist|secretar|rasilimali watu|utawala|katibu|mapokezi)\w*/i],
  ["Legal", /\b(legal|lawyer|attorney|advocate|compliance|counsel|sheria|mwanasheria|wakili)\b/i],
  ["Sales & Marketing", /\b(sales|marketing|business development|brand|communications?|public relations|customer service|mauzo|masoko|mawasiliano|huduma kwa wateja)\b/i],
  ["Logistics & Transport", /\b(logistics|transport|driver|fleet|warehouse|supply chain|procurement|aviation|shipping|dereva|usafiri|ugavi|ununuzi|ghala)\b/i],
  ["Hospitality & Tourism", /\b(hotel|hospitality|tourism|chef|cook|restaurant|housekeep|travel|hoteli|utalii|mpishi)\w*/i],
  ["Agriculture", /\b(agricultur|agronom|farmer|livestock|veterinar|fisher|forestry|kilimo|mifugo|uvuvi|misitu)\w*/i],
  ["Mining, Energy, Oil & Gas", /\b(mining|mine|energy|petroleum|oil|gas|geolog|solar|renewable|madini|mgodi|nishati|mafuta|jiolojia)\w*/i],
  ["Manufacturing", /\b(manufactur|production|factory|plant operator|quality control|kiwanda|uzalishaji|udhibiti ubora)\w*/i],
  ["Construction & Real Estate", /\b(construction|quantity survey|site manager|property|real estate|facilities manager|estate officer|ujenzi|mali isiyohamishika)\w*/i],
  ["Security & Protective Services", /\b(security officer|security guard|loss prevention|firefighter|protective services|usalama|mlinzi|zimamoto)\w*/i],
  ["Banking & Finance", /\b(bank|banking|finance|financial|credit|loan|insurance|investment|microfinance|fintech|benki|fedha|mikopo|bima|uwekezaji)\b/i],
  ["NGO & Development", /\b(ngo|non-government|humanitarian|development|united nations|\bun\b|foundation|charity|relief|programme officer|maendeleo|kibinadamu|hisani)\b/i],
  ["Government", /\b(government|ministry|municipal|council|authority|public service|taasisi|halmashauri|wizara|serikali|manispaa)\b/i],
];

function classifyJob(job = {}) {
  const title = job.title || "";
  const titleRule = RULES.find(([, pattern]) => pattern.test(title));
  if (titleRule) {
    return {
      category: titleRule[0],
      confidence: 0.98,
      evidence: "title",
    };
  }

  const context = [job.company, job.description].filter(Boolean).join(" ");
  const contextRule = RULES.find(([, pattern]) => pattern.test(context));
  if (contextRule) {
    return {
      category: contextRule[0],
      confidence: 0.72,
      evidence: "context",
    };
  }
  return { category: "General", confidence: 0.2, evidence: "fallback" };
}

function categorizeJob(job = {}) {
  return classifyJob(job).category;
}

function acceptAssistedClassification(deterministic, suggestion = {}) {
  const category = String(suggestion.category || "").trim();
  const confidence = Number(suggestion.confidence);
  if (
    deterministic.category !== "General" ||
    !CATEGORIES.includes(category) ||
    category === "General" ||
    !Number.isFinite(confidence) ||
    confidence < 0.9
  ) {
    return deterministic;
  }
  return {
    category,
    confidence: Math.min(confidence, 0.95),
    evidence: "reviewed-assistance",
  };
}

function summarizeClassifications(jobs = []) {
  const distribution = {};
  const review = [];
  for (const job of jobs) {
    const result = classifyJob(job);
    distribution[result.category] = (distribution[result.category] || 0) + 1;
    if (result.confidence < 0.7) {
      review.push({
        sourceId: String(job.sourceId || "").slice(0, 120) || null,
        title: String(job.title || "").slice(0, 160),
        category: result.category,
        confidence: result.confidence,
      });
    }
  }
  return {
    total: jobs.length,
    distribution,
    needsReview: review.length,
    review: review.slice(0, 20),
  };
}

module.exports = {
  CATEGORIES,
  acceptAssistedClassification,
  categorizeJob,
  classifyJob,
  summarizeClassifications,
};
