export function buildPublicNavigation({ employerEnabled = false, candidateCareerEnabled = false } = {}) {
  return [
    { href: "/", label: "Home" },
    { href: "/jobs", label: "Jobs" },
    { href: "/jobs?type=FREELANCE", label: "Freelance" },
    ...(candidateCareerEnabled ? [{ href: "/account/career/cv", label: "CV Builder" }] : []),
    ...(employerEnabled ? [{ href: "/employer", label: "Employers" }] : []),
    { href: "/about", label: "About" },
  ];
}
