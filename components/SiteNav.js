"use client";

import { useState } from "react";
import Link from "next/link";
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
 */
export default function SiteNav({ links = DEFAULT_LINKS, right }) {
  const [open, setOpen] = useState(false);

  return (
    <nav className={styles.nav} aria-label="Primary">
      <div className={styles.bar}>
        <Link href="/" className={styles.logo} onClick={() => setOpen(false)}>
          DARAJA
          <span>Kazi Na Fursa Tanzania</span>
        </Link>

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
            {right ?? (
              <Link
                href="/post-job"
                className={styles.cta}
                onClick={() => setOpen(false)}
              >
                Post a Job
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
