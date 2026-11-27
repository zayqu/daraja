// The public site header links (Figma: Site header). The logo is the way
// home. Community joins this list once its pages exist (D-042).
const INTERNSHIPS_CATEGORY = "Internships & Graduate Programs";

export function buildPublicNavigation({ employerEnabled = false } = {}) {
  return [
    { href: "/jobs", label: "Jobs", match: { path: "/jobs", jobs: true } },
    { href: "/jobs?type=FREELANCE", label: "Freelance", match: { path: "/jobs", type: "FREELANCE" } },
    {
      href: `/jobs?category=${encodeURIComponent(INTERNSHIPS_CATEGORY)}`,
      label: "Internships",
      match: { path: "/jobs", category: INTERNSHIPS_CATEGORY },
    },
    ...(employerEnabled ? [{ href: "/employer", label: "Employers", match: { path: "/employer" } }] : []),
    { href: "/about", label: "About", match: { path: "/about" } },
  ];
}

// Which header link is the current page. `query` is the page's search
// params; job pages count as Jobs unless a Freelance/Internships filter is on.
export function isActiveNavLink(link, pathname = "", query = new URLSearchParams()) {
  const match = link.match;
  if (!match) return false;
  const onPath = pathname === match.path || pathname.startsWith(`${match.path}/`);
  if (!onPath) return false;
  if (match.type) return query.get("type") === match.type;
  if (match.category) return query.get("category") === match.category;
  if (match.jobs) return query.get("type") !== "FREELANCE" && query.get("category") !== INTERNSHIPS_CATEGORY;
  return true;
}
