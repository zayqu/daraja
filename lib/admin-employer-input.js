const clean = (value, max = 160) => (typeof value === "string" ? value.trim().slice(0, max) : "");

function httpsUrl(value) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

// Company details an administrator can set. Returns { data } or { error }.
export function parseEmployerProfile(body) {
  const companyName = clean(body.companyName);
  const industry = clean(body.industry) || null;
  const website = httpsUrl(clean(body.website, 500));
  const logo = httpsUrl(clean(body.logo, 1000));
  if (!companyName) return { error: "Company name is required" };
  if (website === undefined) return { error: "Website must be an https:// address" };
  if (logo === undefined) return { error: "Logo must be an https:// image address" };
  return { data: { companyName, industry, website, logo } };
}
