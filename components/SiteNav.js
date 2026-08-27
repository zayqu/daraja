"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { buildJobsUrl } from "@/lib/job-search";
import styles from "./SiteNav.module.css";

const DEFAULT_LINKS = [
  { href: "/jobs", label: "Browse Jobs" },
  { href: "/jobs?category=Government", label: "Government" },
  { href: "/jobs?category=NGO%20%26%20Development", label: "NGO" },
];

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
  links = DEFAULT_LINKS,
  right,
  showSearch = false,
  showEmployerCta = true,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();

  function handleSearch(event) {
    event.preventDefault();
    setOpen(false);
    router.push(buildJobsUrl({ search: query }));
  }

  return (
    <nav className={styles.nav} aria-label="Primary">
      <div className={styles.bar}>
        <Link href="/" className={styles.logo} onClick={() => setOpen(false)}>
          DARAJA
          <span>Kazi Na Fursa Tanzania</span>
        </Link>

        {showSearch && (
          <form className={styles.search} onSubmit={handleSearch} role="search">
            <input
              type="search"
              className={styles.searchInput}
              placeholder="Search job title or company"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Search jobs"
            />
            <button type="submit" className={styles.searchBtn} aria-label="Search">
              Search
            </button>
          </form>
        )}

        <button
          type="button"
          className={`${styles.toggle} ${open ? styles.open : ""}`}
          aria-expanded={open}
          aria-controls="site-nav-menu"
          aria-label={open ? "Close menu" : "Open menu"}
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
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={styles.link}
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <div className={styles.right}>
            {right ??
              (showEmployerCta ? (
                <Link
                  href="/post-job"
                  className={styles.cta}
                  onClick={() => setOpen(false)}
                >
                  Post a Job
                </Link>
              ) : null)}
          </div>
        </div>
      </div>
    </nav>
  );
}
