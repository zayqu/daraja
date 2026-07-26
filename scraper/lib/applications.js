function normalizeEmployerSubject(subject, position) {
  const value = String(subject || "").replace(/\s+/g, " ").trim();
  if (!value) return `Application for ${position}`;

  return value
    .replace(/\{\{\s*(?:job|position)\s*title\s*\}\}/gi, position)
    .replace(/\[\s*(?:job|position)\s*title\s*\]/gi, position)
    .replace(/\b(?:job|position)\s+title\b/gi, position);
}

function buildEmailApplicationUrl({ email, title, company, subject }) {
  const recipient = String(email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) return null;

  const position = String(title || "the advertised position").trim();
  const employer = String(company || "your organization").trim();
  const emailSubject = normalizeEmployerSubject(subject, position);
  const body = [
    "Dear Hiring Team,",
    "",
    "I hope you are well.",
    "",
    `I would like to submit my application for the ${position} position at ${employer}.`,
    "My experience in [briefly mention your most relevant experience or skill] makes me a strong candidate for this opportunity.",
    "",
    "Please find my CV and supporting documents attached for your review. I would welcome the opportunity to discuss my application further.",
    "",
    "Thank you for your time and consideration.",
    "",
    "Best regards,",
    "[Your full name]",
    "[Your phone number]",
    "[Your current location]",
  ].join("\n");

  return `mailto:${recipient}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(body)}`;
}

function isDirectApplicationUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol === "mailto:") {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        decodeURIComponent(url.pathname)
      );
    }
    return ["https:", "http:"].includes(url.protocol);
  } catch {
    return false;
  }
}

module.exports = {
  buildEmailApplicationUrl,
  isDirectApplicationUrl,
  normalizeEmployerSubject,
};
