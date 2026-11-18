"use client";

import Link from "next/link";
import NavIcon from "@/components/ui/NavIcon";
import { signOutAction } from "@/app/actions/sign-out";
import { PRIVACY_SETTINGS_EVENT } from "@/lib/google-services";
import { WHATSAPP_CHANNEL_URL } from "@/lib/site-config";
import styles from "./MenuList.module.css";

export const INTERNSHIPS_HREF = "/jobs?category=Internships%20%26%20Graduate%20Programs";

// The phone menu pieces shared by the admin's More sheet, the visitors' More
// sheet and the Profile/Account pages (D-038): grouped rows, a line of Daraja
// links and a quiet Sign out at the bottom.

export function MenuRows({ items, activeHref = null, onNavigate }) {
  return (
    <ul className={styles.list}>
      {items.map((item) => (
        <li key={item.href}>
          <Link
            href={item.href}
            className={item.href === activeHref ? styles.rowActive : undefined}
            aria-current={item.href === activeHref ? "page" : undefined}
            onClick={onNavigate}
          >
            <NavIcon name={item.icon} size={18} />
            <span className={styles.rowText}>
              {item.label}
              {item.hint ? <small>{item.hint}</small> : null}
            </span>
            <NavIcon name="chevron" size={16} />
          </Link>
        </li>
      ))}
    </ul>
  );
}

// The first group as rows; the "Settings" group as rows too, or as small
// links when `compactSettings` keeps a long menu short.
export function MenuSections({ sections, activeHref = null, onNavigate, compactSettings = false }) {
  return sections.map((section) =>
    section.label && compactSettings ? (
      <nav key={section.label} className={styles.section} aria-label={section.label}>
        <p className={styles.label}>{section.label}</p>
        <div className={styles.compact}>
          {section.items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={item.href === activeHref ? styles.compactActive : undefined}
              aria-current={item.href === activeHref ? "page" : undefined}
              onClick={onNavigate}
            >
              <NavIcon name={item.icon} size={16} />
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    ) : (
      <nav key={section.label || "main"} className={styles.section} aria-label={section.label || "Menu"}>
        {section.label ? <p className={styles.label}>{section.label}</p> : null}
        <MenuRows items={section.items} activeHref={activeHref} onNavigate={onNavigate} />
      </nav>
    )
  );
}

export function DarajaLinks({ showInternships = false, onNavigate }) {
  return (
    <nav className={styles.links} aria-label="More from Daraja">
      {showInternships ? (
        <Link href={INTERNSHIPS_HREF} onClick={onNavigate}>Internships</Link>
      ) : null}
      <Link href="/about" onClick={onNavigate}>About Daraja</Link>
      <a href={WHATSAPP_CHANNEL_URL} target="_blank" rel="noopener noreferrer" onClick={onNavigate}>
        WhatsApp Channel
      </a>
      <button
        type="button"
        onClick={() => {
          onNavigate?.();
          window.dispatchEvent(new Event(PRIVACY_SETTINGS_EVENT));
        }}
      >
        Privacy choices
      </button>
    </nav>
  );
}

// Always last, plain text: signing out is not an everyday task.
export function SignOutButton() {
  return (
    <form action={signOutAction} className={styles.signOutForm}>
      <button type="submit" className={styles.signOut}>
        <NavIcon name="logout" size={16} />
        <span>Sign out</span>
      </button>
    </form>
  );
}
