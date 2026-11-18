// Menus for the signed-in dashboards (D-038). The desktop sidebar
// (components/dashboard/DashboardShell.js) and the phone "More" sheet
// (components/ui/MobileDock.js) both read these, so each role sees the same
// menu on every screen size. Admins, employers and candidates each get their
// own menu; the routes behind every item exist and check access themselves.

import { postJobHref } from "./platform-roles.js";

const HELP = { href: "/contact", label: "Help & support", icon: "help" };
const ACCOUNT_SETTINGS = { href: "/account/settings", label: "Settings", icon: "settings" };

function adminMenu() {
  return {
    role: "ADMIN",
    roleLabel: "Admin",
    home: "/admin",
    main: [
      { href: "/admin", label: "Overview", icon: "dashboard", exact: true },
      { href: "/admin/jobs", label: "Jobs", icon: "jobs", count: "pendingJobs" },
      { href: postJobHref("ADMIN"), label: "Post a job", icon: "plus" },
      { href: "/admin/employers", label: "Employers", icon: "employer", count: "pendingEmployers" },
      { href: "/admin/users", label: "Users", icon: "users" },
      { href: "/admin/categories", label: "Categories", icon: "categories" },
      { href: "/admin/sources", label: "Sources", icon: "sources" },
    ],
    settings: [
      { href: "/admin/settings", label: "Site settings", icon: "settings" },
      { href: "/account/settings", label: "My account", icon: "user" },
      { href: "/", label: "View the site", icon: "home", exact: true },
    ],
    search: { action: "/admin/jobs", name: "q", placeholder: "Search jobs in admin" },
  };
}

function employerMenu() {
  return {
    role: "EMPLOYER",
    roleLabel: "Employer",
    home: "/employer",
    main: [
      { href: "/employer", label: "Dashboard", icon: "dashboard", exact: true },
      { href: "/employer/vacancies", label: "My vacancies", icon: "jobs" },
      { href: postJobHref("EMPLOYER"), label: "Post a job", icon: "plus" },
      { href: "/employer/profile", label: "Company profile", icon: "employer" },
    ],
    settings: [ACCOUNT_SETTINGS, HELP],
    search: { action: "/jobs", name: "search", placeholder: "Search jobs on Daraja" },
  };
}

function candidateMenu({ candidateCareer }) {
  return {
    role: "JOB_SEEKER",
    roleLabel: "Candidate",
    home: "/account",
    main: [
      { href: "/account", label: "Dashboard", icon: "dashboard", exact: true },
      ...(candidateCareer
        ? [
            { href: "/account/applications", label: "Applications", icon: "document" },
            { href: "/account/saved", label: "Saved jobs", icon: "bookmark" },
            { href: "/account/career/cv", label: "CV Builder", icon: "cv" },
          ]
        : []),
      { href: "/account/alerts", label: "Job alerts", icon: "alert" },
      { href: "/jobs", label: "Find jobs", icon: "search", exact: true },
    ],
    settings: [
      ...(candidateCareer ? [{ href: "/account/profile", label: "My profile", icon: "user" }] : []),
      { href: "/account/notifications", label: "Notifications", icon: "bell" },
      ACCOUNT_SETTINGS,
      HELP,
    ],
    search: { action: "/jobs", name: "search", placeholder: "Search jobs" },
  };
}

// The menu for a signed-in role. Employers use the candidate menu while the
// employer portal is switched off, matching roleHome() in lib/platform-roles.js.
export function dashboardMenu(role, { employerPortal = false, candidateCareer = false } = {}) {
  if (role === "ADMIN") return adminMenu();
  if (role === "EMPLOYER" && employerPortal) return employerMenu();
  return candidateMenu({ candidateCareer });
}

// The one item to highlight for the current page. Exact items match only their
// own path; the others also match their sub-pages, and the most specific match
// wins: "My vacancies" stays highlighted while one vacancy is being edited, and
// an admin on /admin/jobs/new sees "Post a job" rather than "Jobs".
export function activeMenuHref(items, pathname = "") {
  let active = null;
  for (const item of items) {
    const matches = item.exact
      ? pathname === item.href
      : pathname === item.href || pathname.startsWith(`${item.href}/`);
    if (matches && (!active || item.href.length > active.length)) active = item.href;
  }
  return active;
}
