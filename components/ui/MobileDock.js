"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { mobileDockEnabledPath } from "@/lib/mobile-navigation";
import styles from "./MobileDock.module.css";

const WHATSAPP_CHANNEL =
  "https://whatsapp.com/channel/0029Vanw1OQ1CYoYdxl32g3V";

function Icon({ name }) {
  const common = {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none",
    "aria-hidden": true,
  };

  if (name === "home") {
    return (
      <svg {...common}>
        <path d="M3.5 10.5 12 3l8.5 7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5.5 9.8V21h13V9.8" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M9.5 21v-6h5v6" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    );
  }

  if (name === "jobs") {
    return (
      <svg {...common}>
        <rect x="3" y="6.5" width="18" height="13.5" rx="3" stroke="currentColor" strokeWidth="1.8" />
        <path d="M8.5 6.5v-2h7v2M3 11.5h18M10 14h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === "alerts") {
    return (
      <svg {...common}>
        <path d="M18 9a6 6 0 1 0-12 0c0 7-3 7-3 8.5h18C21 16 18 16 18 9Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M9.5 20.5h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === "more") {
    return (
      <svg {...common}>
        <circle cx="5" cy="12" r="1.4" fill="currentColor" />
        <circle cx="12" cy="12" r="1.4" fill="currentColor" />
        <circle cx="19" cy="12" r="1.4" fill="currentColor" />
      </svg>
    );
  }

  return null;
}

export default function MobileDock({ showEmployerCta = false }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    if (!moreOpen) return undefined;

    function onKeyDown(event) {
      if (event.key === "Escape") setMoreOpen(false);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [moreOpen]);

  if (!mobileDockEnabledPath(pathname)) return null;

  const items = [
    { href: "/", label: "Home", icon: "home", active: pathname === "/" },
    {
      href: "/jobs",
      label: "Jobs",
      icon: "jobs",
      active: pathname.startsWith("/jobs"),
    },
    {
      href: "/account/alerts",
      label: "Alerts",
      icon: "alerts",
      active: pathname.startsWith("/account"),
    },
  ];

  return (
    <>
      <div className={styles.spacer} aria-hidden="true" />

      {moreOpen && (
        <div className={styles.sheetLayer}>
          <button
            type="button"
            className={styles.backdrop}
            aria-label="Close menu"
            onClick={() => setMoreOpen(false)}
          />
          <section className={styles.sheet} aria-label="More navigation">
            <div className={styles.sheetHandle} aria-hidden="true" />
            <div className={styles.sheetHeader}>
              <div>
                <span>Daraja</span>
                <strong>More</strong>
              </div>
              <button type="button" onClick={() => setMoreOpen(false)}>
                Close
              </button>
            </div>

            <nav className={styles.sheetLinks}>
              <Link href="/jobs?category=Internships%20%26%20Graduate%20Programs">
                Internships
              </Link>
              <Link href="/about" onClick={() => setMoreOpen(false)}>About Daraja</Link>
              <Link href="/contact" onClick={() => setMoreOpen(false)}>Contact</Link>
              <a href={WHATSAPP_CHANNEL} target="_blank" rel="noopener noreferrer">
                WhatsApp Channel
              </a>
              {showEmployerCta && <Link href="/post-job" onClick={() => setMoreOpen(false)}>Post a Job</Link>}
            </nav>
          </section>
        </div>
      )}

      <nav className={styles.dockWrap} aria-label="Mobile navigation">
        <div className={styles.dock}>
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.item} ${item.active ? styles.active : ""}`}
              aria-current={item.active ? "page" : undefined}
              onClick={() => setMoreOpen(false)}
            >
              <span className={styles.iconWrap}>
                <Icon name={item.icon} />
              </span>
              <span className={styles.label}>{item.label}</span>
            </Link>
          ))}

          <button
            type="button"
            className={`${styles.item} ${moreOpen ? styles.active : ""}`}
            aria-expanded={moreOpen}
            onClick={() => setMoreOpen((value) => !value)}
          >
            <span className={styles.iconWrap}>
              <Icon name="more" />
            </span>
            <span className={styles.label}>More</span>
          </button>
        </div>
      </nav>
    </>
  );
}
