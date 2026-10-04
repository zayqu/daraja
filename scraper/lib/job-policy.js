const catalog = require("../config/source-catalog.json");
const bankCatalog = require("../config/bank-source-catalog.json");

// Single owner of the ingestion publication decision described in
// docs/JOB-SOURCE-POLICY.md: which scraped vacancies publish automatically,
// which wait for an administrator, and which are blocked outright.

const SOURCE_CONFIG = new Map(
  [...catalog.sources, ...bankCatalog.sources].map((source) => [source.id, source])
);

// Lower number = more authoritative (policy "Source precedence").
const PRECEDENCE = {
  daraja: 1,
  government: 2,
  official: 4,
  agency: 5,
  board: 6,
  unknown: 7,
};

function sourcePolicy(sourceId) {
  const config = SOURCE_CONFIG.get(sourceId);
  const explicit = Number(config?.publishPolicy?.precedence);
  let precedence = PRECEDENCE.unknown;
  if (sourceId === "daraja") precedence = PRECEDENCE.daraja;
  else if (Number.isInteger(explicit) && explicit > 0) precedence = explicit;
  else if (sourceId === "ajira") precedence = PRECEDENCE.government;
  else if (config?.adapter === "verified-agency") precedence = PRECEDENCE.agency;
  else if (config?.category === "general_tanzania_job_websites") precedence = PRECEDENCE.board;
  else if (config) precedence = PRECEDENCE.official;

  return {
    autoPublish: config?.publishPolicy?.autoPublish === true,
    precedence,
  };
}

const NEGATION =
  /\b(?:no|not|never|free\s+of|without|zero|hakuna|bila|hatutozi|haitozi|hatulipishi|haitakiwi)\b[^.!?\n]{0,40}$/i;

const AMOUNT = String.raw`(?:tsh|tzs|shs?\b|shilingi|shillings|\d{1,3}(?:,\d{3})+|\d{4,})`;
const WALLET = String.raw`(?:m-?pesa|tigo\s*pesa|mixx\s*by\s*yas|airtel\s*money|halo\s*pesa)`;
const FEE_TERM = String.raw`\b(?:application|registration|processing|medical|training|interview|placement|uniform|form|booking|screening|verification)\s+(?:fee|fees|charge|charges)\b`;
const PAYER_CUE = String.raw`\b(?:pay|paid|pays|send|deposit|transfer|candidates?|applicants?|required\s+to|must)\b`;

// Each pattern describes a candidate being asked to pay. A fee term alone is
// not enough (bank roles mention "processing fees" as duties), so English fee
// terms need a payer cue or an amount next to them.
const FEE_PATTERNS = [
  new RegExp(`${PAYER_CUE}[^.!?\n]{0,40}${FEE_TERM}`, "i"),
  new RegExp(`${FEE_TERM}[^.!?\n]{0,20}${AMOUNT}`, "i"),
  new RegExp(String.raw`\b(?:pay|send|deposit|transfer)\s+(?:a\s+|the\s+)?`+AMOUNT, "i"),
  new RegExp(`${WALLET}[^.!?\n]{0,40}\b(?:pay|send|lipa|tuma)\b`, "i"),
  new RegExp(String.raw`\b(?:pay|send|lipa|tuma)\b[^.!?\n]{0,40}`+WALLET, "i"),
  /\b(?:ada|gharama|malipo)\s+ya\s+(?:maombi|usajili|fomu|mafunzo|matibabu|usaili|kuomba)\b/i,
  new RegExp(String.raw`\b(?:lipa|tuma|utalipa|watalipa|kulipa)\s+(?:(?:pesa|kiasi|cha)\s+){0,3}`+AMOUNT, "i"),
];

function feeSignal(text) {
  for (const pattern of FEE_PATTERNS) {
    const global = new RegExp(pattern.source, "gi");
    for (const match of text.matchAll(global)) {
      const before = text.slice(Math.max(0, match.index - 60), match.index);
      if (!NEGATION.test(before) && !NEGATION.test(match[0])) {
        return match[0].trim();
      }
    }
  }
  return null;
}

const MESSAGING_HOSTS = /^(?:wa\.me|api\.whatsapp\.com|chat\.whatsapp\.com|t\.me|telegram\.me)$/i;

function messagingOnlyApplication(job) {
  if (!job.applicationUrl) return false;
  try {
    return MESSAGING_HOSTS.test(new URL(job.applicationUrl).hostname);
  } catch {
    return false;
  }
}

// Returns { status, note } where status is a JobModerationStatus value.
function decidePublication(job, sourceId) {
  const text = [job.title, job.description].filter(Boolean).join("\n");
  const fee = feeSignal(text);
  if (fee) {
    return {
      status: "REJECTED",
      note: `Automatically blocked: vacancy asks candidates to pay ("${fee.slice(0, 80)}").`,
    };
  }

  const reasons = [];
  if (!sourcePolicy(sourceId).autoPublish) {
    reasons.push("source has not been approved for automatic publication");
  }
  if (messagingOnlyApplication(job)) {
    reasons.push("applications go only through a messaging app");
  }

  return reasons.length
    ? { status: "PENDING_REVIEW", note: `Needs review: ${reasons.join("; ")}.` }
    : { status: "PUBLISHED", note: null };
}

module.exports = {
  decidePublication,
  feeSignal,
  sourcePolicy,
};
