const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_INTERESTS = 5;
const MAX_INTEREST_LENGTH = 60;

export function normalizeInterests(value) {
  const values = Array.isArray(value) ? value : String(value || "").split(",");

  return [...new Set(
    values
      .map((interest) => String(interest).replace(/\s+/g, " ").trim())
      .filter(
        (interest) =>
          interest.length >= 2 && interest.length <= MAX_INTEREST_LENGTH
      )
  )].slice(0, MAX_INTERESTS);
}

export function validateJobAlertSubscription(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { error: "Enter valid subscription details." };
  }

  const email = String(body.email || "").trim().toLowerCase();
  const interests = normalizeInterests(body.interests);

  if (!EMAIL_PATTERN.test(email) || email.length > 254) {
    return { error: "Enter a valid email address." };
  }

  if (body.consent !== true) {
    return { error: "Please agree to receive job alerts." };
  }

  if (!interests.length) {
    return { error: "Enter at least one job field or position." };
  }

  return { email, interests };
}
