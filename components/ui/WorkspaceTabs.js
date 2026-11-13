"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./WorkspaceTabs.module.css";

// The tab whose path is the longest match for the current page is marked
// current, so /account/career/cv highlights "CV Builder", not "Account".
function currentHref(pathname, links) {
  let current = null;
  for (const { href } of links) {
    if (pathname === href || pathname.startsWith(`${href}/`)) {
      if (!current || href.length > current.length) current = href;
    }
  }
  return current;
}

export default function WorkspaceTabs({ links, label }) {
  const current = currentHref(usePathname() || "", links);

  return (
    <nav className={styles.tabs} aria-label={label}>
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={link.href === current ? styles.current : undefined}
          aria-current={link.href === current ? "page" : undefined}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
