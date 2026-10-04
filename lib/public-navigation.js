export function buildPublicNavigation({ employerEnabled = false } = {}) {
  return [
    { href: "/", label: "Home" },
    { href: "/jobs", label: "Jobs" },
    { href: "/jobs?type=FREELANCE", label: "Freelance" },
    ...(employerEnabled ? [{ href: "/employer", label: "Employers" }] : []),
    { href: "/about", label: "About" },
  ];
}
