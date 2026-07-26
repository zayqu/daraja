function buildEmailApplicationUrl({ email, title, company }) {
  const recipient = String(email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) return null;

  const position = String(title || "the advertised position").trim();
  const employer = String(company || "your organization").trim();
  const subject = `Application for ${position}`;
  const body = [
    "Dear Hiring Manager,",
    "",
    `I am writing to apply for the ${position} position at ${employer}.`,
    "",
    "Please find my CV and application letter attached for your consideration.",
    "",
    "Candidate details:",
    "Full name: [Enter your full name]",
    "Phone number: [Enter your phone number]",
    "Current location: [Enter your location]",
    "",
    "Kind regards,",
    "[Enter your full name]",
  ].join("\n");

  return `mailto:${recipient}?${new URLSearchParams({ subject, body }).toString()}`;
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

module.exports = { buildEmailApplicationUrl, isDirectApplicationUrl };
