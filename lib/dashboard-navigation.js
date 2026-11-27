// Menus for the signed-in dashboards (D-038). The desktop sidebar
// (components/dashboard/DashboardShell.js) shows `main` and `settings`. On
// phones the bottom dock (components/ui/MobileDock.js) shows the role's
// everyday tasks (`dock`) plus `accountTab`: a page (Profile, Account) or, for
// admins, "More", the only tab that opens a menu. Whatever the dock does not
// show is listed once, by `secondaryMenuSections`, on that page or in More.
// The routes behind every item exist and check access themselves.

import { postJobHref } from "./platform-roles.js";

// `inTopbar` items also sit in the desktop top bar, so the sidebar skips them;
// phone menus still list them.
const HELP = { href: "/contact", label: "Help & support", icon: "help", inTopbar: true };
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
      { href: "/admin/categories", label: "Categories", icon: "categories", rarelyUsed: true },
      { href: "/admin/sources", label: "Sources", icon: "sources", rarelyUsed: true },
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
    accountTab: { label: "Account", icon: "user", href: "/employer/profile" },
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
            { href: "/account/jobs", label: "My jobs", icon: "bookmark" },
            { href: "/account/career/cv", label: "CV Builder", icon: "cv" },
          ]
        : []),
      { href: "/account/alerts", label: "Job alerts", icon: "alert" },
      { href: "/jobs", label: "Find jobs", icon: "search", exact: true },
    ],
    settings: [
      ...(candidateCareer ? [{ href: "/account/profile", label: "Profile", icon: "user" }] : []),
      { href: "/account/notifications", label: "Notifications", icon: "bell", inTopbar: true },
      ACCOUNT_SETTINGS,
      HELP,
    ],
    search: { action: "/jobs", name: "search", placeholder: "Search jobs" },
    // Finding and following jobs (Discover also covers each job's own page),
    // then the CV Builder, Daraja's free tool for standing out.
    dock: [
      { href: "/jobs", label: "Discover", icon: "search" },
      ...(candidateCareer
        ? [
            { href: "/account/jobs", label: "My jobs", icon: "bookmark" },
            { href: "/account/career/cv", label: "CV", icon: "cv" },
          ]
        : [{ href: "/account/alerts", label: "Alerts", icon: "alert" }]),
    ],
    accountTab: {
      label: "Profile",
      icon: "user",
      href: candidateCareer ? "/account/profile" : "/account/settings",
    },
  };
}

// The menu for a signed-in role. Employers use the candidate menu while the
// employer portal is switched off, matching roleHome() in lib/platform-roles.js.
export function dashboardMenu(role, { employerPortal = false, candidateCareer = false } = {}) {
  if (role === "ADMIN") return adminMenu();
  if (role === "EMPLOYER" && employerPortal) return employerMenu();
  return candidateMenu({ candidateCareer });
}

// Everything in the role's menu that the dock does not show, listed on the
// Profile/Account page or in the admin's More menu: everyday items first, then
// a "Settings" group that also takes the rarely used tools.
export function secondaryMenuSections(menu) {
  const shown = new Set([...menu.dock, menu.accountTab].map((item) => item.href).filter(Boolean));
  const rest = (items) => items.filter((item) => !shown.has(item.href));
  return [
    { label: null, items: rest(menu.main).filter((item) => !item.rarelyUsed) },
    { label: "Settings", items: [...rest(menu.main).filter((item) => item.rarelyUsed), ...rest(menu.settings)] },
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
