"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { mobileDockEnabledPath } from "@/lib/mobile-navigation";
import NavIcon from "@/components/ui/NavIcon";
import { PRIVACY_SETTINGS_EVENT } from "@/lib/google-services";
import styles from "./MobileDock.module.css";

const WHATSAPP_CHANNEL =
  "https://whatsapp.com/channel/0029Vanw1OQ1CYoYdxl32g3V";

export default function MobileDock({
  showEmployerCta = false,
  showCandidateProfile = false,
  userRole = null,
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [moreOpen, setMoreOpen] = useState(false);
  const freelanceActive =
    pathname.startsWith("/jobs") && searchParams.get("type") === "FREELANCE";
  const isCandidate = userRole === "JOB_SEEKER";
  const isEmployer = userRole === "EMPLOYER";
  const isAdmin = userRole === "ADMIN";

  useEffect(() => {
    if (!moreOpen) return undefined;

    function onKeyDown(event) {
      if (event.key === "Escape") setMoreOpen(false);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [moreOpen]);

  if (!mobileDockEnabledPath(pathname)) return null;

  const roleItem =
    isAdmin
      ? {
          href: "/admin",
          label: "Admin",
          icon: "admin",
          active: pathname.startsWith("/admin"),
        }
      : isEmployer && showEmployerCta
        ? {
            href: "/employer",
            label: "Employer",
            icon: "employer",
            active:
              pathname.startsWith("/employer") ||
              pathname.startsWith("/post-job"),
          }
        : isCandidate && showCandidateProfile
          ? {
              href: "/account/career",
              label: "Career",
              icon: "user",
              active: pathname.startsWith("/account/career"),
            }
          : {
              href: "/jobs?type=FREELANCE",
              label: "Freelance",
              icon: "freelance",
              active: freelanceActive,
            };

  const items = [
    { href: "/", label: "Home", icon: "home", active: pathname === "/" },
    {
      href: "/jobs",
      label: "Jobs",
      icon: "jobs",
      active: pathname.startsWith("/jobs") && !freelanceActive,
    },
    roleItem,
  ];

  const dockItemCount = items.length + 1;

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
              {showCandidateProfile && isCandidate && (
                <Link href="/account/career" onClick={() => setMoreOpen(false)}>
                  Career workspace
                </Link>
              )}
              <Link href="/account/alerts" onClick={() => setMoreOpen(false)}>
                Job alerts
              </Link>
              <Link href="/account/privacy" onClick={() => setMoreOpen(false)}>
                Privacy & data
              </Link>
              <button
                type="button"
                onClick={() => {
                  setMoreOpen(false);
                  window.dispatchEvent(new Event(PRIVACY_SETTINGS_EVENT));
                }}
              >
                Privacy choices
              </button>
              {showEmployerCta && (isEmployer || isAdmin) && (
                <Link href="/employer" onClick={() => setMoreOpen(false)}>
                  Employer workspace
                </Link>
              )}
              {isAdmin && (
                <Link href="/admin" onClick={() => setMoreOpen(false)}>
                  Admin
                </Link>
              )}
              <Link href="/jobs?category=Internships%20%26%20Graduate%20Programs" onClick={() => setMoreOpen(false)}>
                Internships
              </Link>
              <Link href="/about" onClick={() => setMoreOpen(false)}>About Daraja</Link>
              <Link href="/contact" onClick={() => setMoreOpen(false)}>Contact</Link>
              <a href={WHATSAPP_CHANNEL} target="_blank" rel="noopener noreferrer" onClick={() => setMoreOpen(false)}>
                WhatsApp Channel
              </a>
              {showEmployerCta && (isEmployer || isAdmin) && (
                <Link href="/post-job" onClick={() => setMoreOpen(false)}>
                  Post a Job
                </Link>
              )}
            </nav>
          </section>
        </div>
      )}

      <nav className={styles.dockWrap} aria-label="Mobile navigation">
        <div className={styles.dock} style={{ "--dock-item-count": dockItemCount }}>
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.item} ${item.active ? styles.active : ""}`}
              aria-current={item.active ? "page" : undefined}
              onClick={() => setMoreOpen(false)}
            >
              <span className={styles.iconWrap}>
                <NavIcon name={item.icon} size={24} />
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
              <NavIcon name="more" size={24} />
            </span>
            <span className={styles.label}>More</span>
          </button>
        </div>
      </nav>
    </>
  );
}
