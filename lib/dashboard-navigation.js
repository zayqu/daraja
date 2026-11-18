// Menus for the signed-in dashboards (D-038). The desktop sidebar
// (components/dashboard/DashboardShell.js) shows `main` and `settings`. On
// phones the bottom dock (components/ui/MobileDock.js) shows the role's
// everyday tasks (`dock`) plus one tab (`accountTab`) that opens the rest of
// the same menu, so nothing appears twice. The routes behind every item exist
// and check access themselves.

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
    // The review queues come first; their badges count what is waiting.
    dock: [
      { href: "/admin", label: "Overview", icon: "dashboard", exact: true },
      { href: "/admin/jobs", label: "Jobs", icon: "jobs", count: "pendingJobs" },
      { href: "/admin/employers", label: "Employers", icon: "employer", count: "pendingEmployers" },
    ],
    accountTab: { label: "More", icon: "more" },
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
    // Posting a vacancy is the main action, so it gets the highlighted tab.
    dock: [
      { href: "/employer", label: "Overview", icon: "dashboard", exact: true },
      { href: "/employer/vacancies", label: "Vacancies", icon: "jobs" },
      { href: postJobHref("EMPLOYER"), label: "Post job", icon: "plus", primary: true },
    ],
    accountTab: { label: "Account", icon: "user" },
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
    // Finding and following jobs; Discover also covers each job's own page.
    dock: [
      { href: "/jobs", label: "Discover", icon: "search" },
      ...(candidateCareer
        ? [
            { href: "/account/saved", label: "Saved", icon: "bookmark" },
            { href: "/account/applications", label: "Applications", icon: "document" },
          ]
        : [{ href: "/account/alerts", label: "Alerts", icon: "alert" }]),
    ],
    accountTab: { label: "Profile", icon: "user" },
  };
}

// The menu for a signed-in role. Employers use the candidate menu while the
// employer portal is switched off, matching roleHome() in lib/platform-roles.js.
export function dashboardMenu(role, { employerPortal = false, candidateCareer = false } = {}) {
  if (role === "ADMIN") return adminMenu();
  if (role === "EMPLOYER" && employerPortal) return employerMenu();
  return candidateMenu({ candidateCareer });
}

// What the dock's last tab ("Profile", "Account" or "More") lists: the rest
// of the role's menu in the sidebar's two groups, without anything the dock
// already shows.
export function accountSheetSections(menu) {
  const inDock = new Set(menu.dock.map((item) => item.href));
  const rest = (items) => items.filter((item) => !inDock.has(item.href));
  return [
    { label: null, items: rest(menu.main) },
    { label: "Settings", items: rest(menu.settings) },
  ].filter((section) => section.items.length);
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
