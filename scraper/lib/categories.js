const CATEGORIES = [
  "Government",
  "NGO & Development",
  "Banking & Finance",
  "Technology",
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
  "Internships & Graduate Programs",
  "General",
];

const RULES = [
  ["Internships & Graduate Programs", /\b(intern(ship)?|graduate trainee|management trainee|volunteer)\b/i],
  ["Technology", /\b(software|developer|programmer|data scientist|data analyst|cyber|information technology|\bit\b|ict|network|systems? administrator|digital)\b/i],
  ["Health", /\b(doctor|nurse|medical|clinical|pharmac|health|laborator|nutrition|radiolog|dentist|midwi)\w*/i],
  ["Education", /\b(teacher|lecturer|tutor|professor|education|academic|school|university|research)\b/i],
  ["Engineering", /\b(engineer|engineering|architect|surveyor|technician|mechanic|electrician)\b/i],
  ["Accounting & Audit", /\b(accountant|accounting|auditor|audit|bookkeep|treasurer)\w*/i],
  ["HR & Administration", /\b(human resources?|\bhr\b|administrat|office manager|receptionist|secretar)\w*/i],
  ["Legal", /\b(legal|lawyer|attorney|advocate|compliance|counsel)\b/i],
  ["Sales & Marketing", /\b(sales|marketing|business development|brand|communications?|public relations|customer service)\b/i],
  ["Logistics & Transport", /\b(logistics|transport|driver|fleet|warehouse|supply chain|procurement|aviation|shipping)\b/i],
  ["Hospitality & Tourism", /\b(hotel|hospitality|tourism|chef|cook|restaurant|housekeep|travel)\w*/i],
  ["Agriculture", /\b(agricultur|agronom|farmer|livestock|veterinar|fisher|forestry)\w*/i],
  ["Mining, Energy, Oil & Gas", /\b(mining|mine|energy|petroleum|oil|gas|geolog|solar|renewable)\w*/i],
  ["Manufacturing", /\b(manufactur|production|factory|plant operator|quality control)\w*/i],
  ["Banking & Finance", /\b(bank|banking|finance|financial|credit|loan|insurance|investment|microfinance|fintech)\b/i],
  ["NGO & Development", /\b(ngo|non-government|humanitarian|development|united nations|\bun\b|foundation|charity|relief|programme officer)\b/i],
  ["Government", /\b(government|ministry|municipal|council|authority|public service|taasisi|halmashauri|wizara)\b/i],
];

function categorizeJob(job = {}) {
  if (job.source === "ajira") return "Government";

  const text = [job.title, job.company, job.description]
    .filter(Boolean)
    .join(" ");

  return RULES.find(([, pattern]) => pattern.test(text))?.[0] || "General";
}

module.exports = { CATEGORIES, categorizeJob };
