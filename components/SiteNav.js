"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { buildJobsUrl } from "@/lib/job-search";
import { mobileDockEnabledPath } from "@/lib/mobile-navigation";
import NavIcon from "@/components/ui/NavIcon";
import { ThemeToggle } from "@/components/ThemeControls";
import LanguageSwitch from "@/components/LanguageSwitch";
import { useT } from "@/components/LanguageProvider";
import { buildPublicNavigation, isActiveNavLink } from "@/lib/public-navigation";
import DarajaLogo from "@/components/ui/DarajaLogo";
import { postJobHref, roleHome } from "@/lib/platform-roles";
import { dashboardMenu } from "@/lib/dashboard-navigation";
import styles from "./SiteNav.module.css";


/**
 * Shared site header used across marketing pages (home, jobs, job detail)
 * and portal pages (account, employer, admin, post-job, auth) so every
 * page offers the same, working, responsive way back into the site.
 *
 * `right` lets a page swap the default "Post a Job" CTA for something else
 * (e.g. a sign-out form), including server-rendered content passed down
 * from a parent Server Component.
 *
 * `showSearch` docks a compact search field in the bar itself (submitting
 * takes the visitor straight to the canonical /jobs?search=... URL), instead
 * of requiring a
 * separate search header further down the page.
 *
 * `showEmployerCta` keeps disabled employer entry points out of public
 * navigation while preserving the same component inside enabled workspaces.
 */
export default function SiteNav({
  links,
  right,
  showSearch = false,
  showEmployerCta = true,
  showCandidateProfile = false,
  notificationCount = 0,
}) {
  const t = useT();
  // One link list for every public page (lib/public-navigation.js).
  const navLinks = links || buildPublicNavigation({ employerEnabled: showEmployerCta });
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();
  const pathname = usePathname();
  const dockManaged = mobileDockEnabledPath(pathname);
  // The Freelance and Internships filters live in the query string;
  // read it after load so public pages stay static.
  const [pageQuery, setQueryParams] = useState(() => new URLSearchParams());
  useEffect(() => {
    const read = () => setQueryParams(new URLSearchParams(window.location.search));
    read();
    window.addEventListener("popstate", read);
    return () => window.removeEventListener("popstate", read);
  }, [pathname, open]);
  // Read the session in the browser so public pages stay cacheable.
  const [account, setAccount] = useState(null);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/session", { credentials: "same-origin" })
      .then((response) => (response.ok ? response.json() : null))
      .then((session) => {
        if (cancelled) return;
        const role = session?.user?.role;
        setAccount(
          session?.user
            ? { signedIn: true, role, href: roleHome(role, { employerPortal: showEmployerCta }) }
            : { signedIn: false }
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [showEmployerCta]);

  function handleSearch(event) {
    event.preventDefault();
    setOpen(false);
    router.push(buildJobsUrl({ search: query }));
  }

  return (
    <nav className={`${styles.nav} ${dockManaged ? styles.dockManaged : ""}`} aria-label="Primary">
      <div className={styles.bar}>
        <Link href="/" className={styles.logo} onClick={() => setOpen(false)} aria-label={t("Daraja home")}>
          <DarajaLogo />
        </Link>

        {showSearch && (
          <form className={styles.search} onSubmit={handleSearch} role="search">
            <input
              type="search"
              className={styles.searchInput}
              placeholder={t("Search job title or company")}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label={t("Search jobs")}
            />
            <button type="submit" className={styles.searchBtn} aria-label={t("Search")}>
              {t("Search")}
            </button>
          </form>
        )}

        {/* Phones: the dock owns the account menu (D-038), so the header only
            offers sign-in to visitors and the bell to candidates. */}
        {dockManaged && account && (
          <div className={styles.mobileAccountActions}>
            {!account.signedIn ? (
              <Link
                href="/auth/signin"
                className={styles.mobileIconButton}
                aria-label={t("Sign in")}
                title={t("Sign in")}
              >
                <NavIcon name="user" />
              </Link>
            ) : dashboardMenu(account.role, {
                employerPortal: showEmployerCta,
                candidateCareer: showCandidateProfile,
              }).role === "JOB_SEEKER" ? (
              <Link
                href="/account/notifications"
                className={styles.mobileIconButton}
                aria-label={t("Notifications")}
                title={t("Notifications")}
              >
                <NavIcon name="bell" />
                {notificationCount > 0 ? (
                  <span className={styles.mobileBadge}>
                    {notificationCount > 99 ? "99+" : notificationCount}
                  </span>
                ) : null}
              </Link>
            ) : null}
          </div>
        )}

        <button
          type="button"
          className={`${styles.toggle} ${open ? styles.open : ""}`}
          aria-expanded={open}
          aria-controls="site-nav-menu"
          aria-label={t(open ? "Close menu" : "Open menu")}
          onClick={() => setOpen((value) => !value)}
        >
          <span className={styles.toggleBar} />
          <span className={styles.toggleBar} />
          <span className={styles.toggleBar} />
        </button>

        <div
          id="site-nav-menu"
          className={`${styles.links} ${open ? styles.linksOpen : ""}`}
        >
          {navLinks.map((link) => {
            const active = isActiveNavLink(link, pathname, pageQuery);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`${styles.link} ${active ? styles.linkActive : ""}`}
                aria-current={active ? "page" : undefined}
                onClick={() => {
                  setOpen(false);
                  setQueryParams(new URL(link.href, window.location.origin).searchParams);
                }}
              >
                {t(link.label)}
              </Link>
            );
          })}
          <div className={styles.right}>
            <LanguageSwitch />
            <ThemeToggle className={styles.themeToggle} />
            {account ? (
              <Link
                href={account.signedIn ? account.href : "/auth/signin"}
                className={styles.secondaryCta}
                onClick={() => setOpen(false)}
              >
                {t(account.signedIn ? "Dashboard" : "Sign in")}
              </Link>
            ) : null}
            {right ??
              (showEmployerCta ? (
                <Link
                  href={postJobHref(account?.role)}
                  className={styles.cta}
                  onClick={() => setOpen(false)}
                >
                  {t("Post a job")}
                </Link>
              ) : account && !account.signedIn ? (
                <Link href="/auth/signup" className={styles.cta} onClick={() => setOpen(false)}>
                  {t("Create account")}
                </Link>
              ) : null)}
          </div>
        </div>
      </div>
    </nav>
  );
}
