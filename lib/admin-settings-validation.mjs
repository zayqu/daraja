// Validate settings by key; text inputs must not inherit email validation.
const SENDER = /^(?:[^<>@\n]{1,80}<)?[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+>?$/;

export function parseSettingValue(key, definition, value) {
  if (definition.type === "boolean") {
    return typeof value === "boolean" ? { value } : { error: "Choose on or off" };
  }
  if (definition.type === "number") {
    const parsed = typeof value === "string" && value.trim() !== "" ? Number(value.trim()) : value;
    if (!Number.isSafeInteger(parsed) || parsed < 0 || parsed > 100000000) {
      return { error: "Enter a valid non-negative whole number" };
    }
    if (key === "promo.days" && (parsed < 1 || parsed > 365)) {
      return { error: "Featured period must be between 1 and 365 days" };
    }
    return { value: parsed };
  }
  if (definition.type === "list") {
    const list = (Array.isArray(value) ? value : String(value || "").split("\n"))
      .map((item) => String(item).trim()).filter((item) => item.length >= 3)
      .slice(0, 200).map((item) => item.slice(0, 120));
    return { value: [...new Set(list)] };
  }
  if (typeof value !== "string") return { error: "Enter a valid text value" };
  const text = value.trim();
  if (text.length > 200) return { error: "Text is too long (maximum 200 characters)" };

  if (key === "promo.whatsapp") {
    if (!text) return { value: "" };
    const normalized = text.replace(/[\s()+-]/g, "");
    if (!/^[1-9]\d{7,14}$/.test(normalized)) {
      return { error: "Enter a valid international WhatsApp number, e.g. 255745990159" };
    }
    return { value: normalized };
  }
  if (key === "promo.lipaNamba") {
    if (text && !/^\d{4,15}$/.test(text.replace(/\s/g, ""))) {
      return { error: "Enter a valid Lipa Namba using digits only" };
    }
    return { value: text.replace(/\s/g, "") };
  }
  if (key === "promo.lipaName") {
    if (text.length > 120) return { error: "Account name must be 120 characters or fewer" };
    return { value: text };
  }
  if (key === "email.accountFrom" && text && !SENDER.test(text)) {
    return { error: "Use an email address, e.g. Daraja <no-reply@daraja.co.tz>" };
  }
  return { value: text };
}
