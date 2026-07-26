const CATEGORIES = require("../../config/job-categories.json");

const RULES = [
  ["Internships & Graduate Programs", /\b(intern(ship)?|graduate trainee|management trainee|volunteer|mafunzo kwa vitendo)\b/i],
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
  ["Banking & Finance", /\b(bank|banking|finance|financial|credit|loan|insurance|investment|microfinance|fintech|benki|fedha|mikopo|bima|uwekezaji)\b/i],
  ["NGO & Development", /\b(ngo|non-government|humanitarian|development|united nations|\bun\b|foundation|charity|relief|programme officer|maendeleo|kibinadamu|hisani)\b/i],
  ["Government", /\b(government|ministry|municipal|council|authority|public service|taasisi|halmashauri|wizara|serikali|manispaa)\b/i],
];

function categorizeJob(job = {}) {
  const title = job.title || "";
  const titleCategory = RULES.find(([, pattern]) => pattern.test(title))?.[0];
  if (titleCategory) return titleCategory;

  const context = [job.company, job.description].filter(Boolean).join(" ");
  return RULES.find(([, pattern]) => pattern.test(context))?.[0] || "General";
}

module.exports = { CATEGORIES, categorizeJob };
