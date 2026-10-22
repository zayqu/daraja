"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import styles from "./admin.module.css";

const NAV = [
  { href: "/admin", label: "Overview", exact: true },
  { href: "/admin/jobs", label: "Jobs", count: "pendingJobs" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/employers", label: "Employers", count: "pendingEmployers" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/sources", label: "Sources" },
  { href: "/admin/settings", label: "Settings" },
];

export default function AdminShell({ email, counts = {}, signOut, children }) {
  const pathname = usePathname();
  // The phone menu remembers which page it was opened on, so it closes by
  // itself after navigating.
  const [openOn, setOpenOn] = useState(null);
  const open = openOn === pathname;
  const setOpen = (toggle) => setOpenOn(toggle(open) ? pathname : null);
  return (
    <div className={styles.shell}>
      <aside className={`${styles.sidebar} ${open ? styles.sidebarOpen : ""}`} aria-label="Admin navigation">
        <Link href="/admin" className={styles.brand}>
          DARAJA <small>ADMIN</small>
        </Link>
        <button
          type="button"
          className={styles.drawerToggle}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "Close" : "Menu"}
        </button>
        <nav className={styles.nav}>
          {NAV.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            const count = item.count ? counts[item.count] : 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navLink} ${active ? styles.navActive : ""}`}
                aria-current={active ? "page" : undefined}
              >
                {item.label}
                {count ? <span className={styles.navCount}>{count > 99 ? "99+" : count}</span> : null}
              </Link>
            );
          })}
        </nav>
        <div className={styles.sidebarFoot}>
          <span>{email}</span>
          <Link href="/">View the site</Link>
          {signOut}
        </div>
      </aside>
      <main id="main-content" className={styles.main}>
        {children}
      </main>
    </div>
  );
}
