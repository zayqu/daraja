"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { mobileDockEnabledPath } from "@/lib/mobile-navigation";
import { accountSheetSections, activeMenuHref, dashboardMenu } from "@/lib/dashboard-navigation";
import { signOutAction } from "@/app/actions/sign-out";
import NavIcon from "@/components/ui/NavIcon";
import { PRIVACY_SETTINGS_EVENT } from "@/lib/google-services";
import { WHATSAPP_CHANNEL_URL } from "@/lib/site-config";
import styles from "./MobileDock.module.css";

const INTERNSHIPS_HREF = "/jobs?category=Internships%20%26%20Graduate%20Programs";

function initialsOf(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length > 1) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return (parts[0] || "D").slice(0, 2).toUpperCase();
}

// Phone navigation (D-027, D-038). Signed-in users get their role's everyday
// tasks as tabs plus one tab ("Profile", "Account" or "More") that opens a
// short list with the rest of their menu; visitors get Home, Jobs, Freelance
// and More. Desktop uses the dashboard sidebar instead.
export default function MobileDock({
  showEmployerCta = false,
  showCandidateProfile = false,
  userRole = null,
  userName = null,
  counts = null,
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [sheetOpen, setSheetOpen] = useState(false);
  const closeButtonRef = useRef(null);
  const sheetTabRef = useRef(null);
  const freelanceActive =
    pathname.startsWith("/jobs") && searchParams.get("type") === "FREELANCE";

  useEffect(() => {
    if (!sheetOpen) return undefined;
    closeButtonRef.current?.focus();
    const sheetTab = sheetTabRef.current;

    function onKeyDown(event) {
      if (event.key === "Escape") setSheetOpen(false);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      sheetTab?.focus();
    };
  }, [sheetOpen]);

  if (!mobileDockEnabledPath(pathname)) return null;

  const close = () => setSheetOpen(false);
  const menu = userRole
    ? dashboardMenu(userRole, { employerPortal: showEmployerCta, candidateCareer: showCandidateProfile })
    : null;

  let tabs;
  let activeHref = null;
  let sheetTabActive = false;
  if (menu) {
    // The home page belongs to no tab (it is only the admin's "View the site").
    activeHref = activeMenuHref(
      [...menu.dock, ...menu.main, ...menu.settings].filter((item) => item.href !== "/"),
      pathname
    );
    tabs = menu.dock.map((item) => ({
      ...item,
      active: item.href === activeHref,
      badge: item.count ? Number(counts?.[item.count] || 0) : 0,
    }));
    // A page from the sheet (e.g. Settings) lights up the sheet's tab.
    sheetTabActive = Boolean(activeHref) && !menu.dock.some((item) => item.href === activeHref);
  } else {
    tabs = [
      { href: "/", label: "Home", icon: "home", active: pathname === "/" },
      { href: "/jobs", label: "Jobs", icon: "jobs", active: pathname.startsWith("/jobs") && !freelanceActive },
      { href: "/jobs?type=FREELANCE", label: "Freelance", icon: "freelance", active: freelanceActive },
    ];
  }
  const sheetTab = menu ? menu.accountTab : { label: "More", icon: "more" };
  const sections = menu ? accountSheetSections(menu) : [];

  function openPrivacyChoices() {
    close();
    window.dispatchEvent(new Event(PRIVACY_SETTINGS_EVENT));
  }

  return (
    <>
      <div className={styles.spacer} aria-hidden="true" />

      {sheetOpen && (
        <div className={styles.sheetLayer}>
          <button
            type="button"
            className={styles.backdrop}
            aria-hidden="true"
            tabIndex={-1}
            onClick={close}
          />
          <section
            className={styles.sheet}
            role="dialog"
            aria-modal="true"
            aria-label={menu ? `${menu.roleLabel} menu` : "Daraja menu"}
          >
            <div className={styles.sheetHandle} aria-hidden="true" />
            <div className={styles.sheetHeader}>
              {menu ? (
                <div className={styles.identity}>
                  <span className={styles.identityAvatar} aria-hidden="true">{initialsOf(userName)}</span>
                  <div>
                    <strong>{userName || "Your account"}</strong>
                    <span>{menu.roleLabel}</span>
                  </div>
                </div>
              ) : (
                <div className={styles.identity}>
                  <div>
                    <strong>Daraja</strong>
                    <span>Kazi na fursa Tanzania</span>
                  </div>
                </div>
              )}
              <div className={styles.headerActions}>
                {/* Next to who is signed in, small and quiet: not an everyday task. */}
                {menu ? (
                  <form action={signOutAction}>
                    <button type="submit" className={styles.signOut}>
                      <NavIcon name="logout" size={16} />
                      <span>Sign out</span>
                    </button>
                  </form>
                ) : null}
                <button
                  ref={closeButtonRef}
                  type="button"
                  className={styles.closeButton}
                  aria-label="Close menu"
                  onClick={close}
                >
                  <NavIcon name="close" size={18} />
                </button>
              </div>
            </div>

            {menu ? (
              sections.map((section) => (
                <div key={section.label || "main"} className={styles.sheetSection}>
                  {section.label ? <p className={styles.sheetLabel}>{section.label}</p> : null}
                  <ul className={styles.sheetList}>
                    {section.items.map((item) => (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={item.href === activeHref ? styles.rowActive : undefined}
                          aria-current={item.href === activeHref ? "page" : undefined}
                          onClick={close}
                        >
                          <NavIcon name={item.icon} size={18} />
                          <span>{item.label}</span>
                          <NavIcon name="chevron" size={16} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            ) : (
              <>
                <div className={styles.authActions}>
                  <Link href="/auth/signin" className={styles.authPrimary} onClick={close}>
                    Sign in
                  </Link>
                  <Link href="/auth/signup" className={styles.authSecondary} onClick={close}>
                    Create account
                  </Link>
                </div>
                <ul className={styles.sheetList}>
                  <li>
                    <Link href="/account/alerts" onClick={close}>
                      <NavIcon name="alert" size={18} />
                      <span>Job alerts</span>
                      <NavIcon name="chevron" size={16} />
                    </Link>
                  </li>
                  <li>
                    <Link href={INTERNSHIPS_HREF} onClick={close}>
                      <NavIcon name="internships" size={18} />
                      <span>Internships</span>
                      <NavIcon name="chevron" size={16} />
                    </Link>
                  </li>
                  <li>
                    <Link href="/about" onClick={close}>
                      <NavIcon name="info" size={18} />
                      <span>About Daraja</span>
                      <NavIcon name="chevron" size={16} />
                    </Link>
                  </li>
                  <li>
                    <Link href="/contact" onClick={close}>
                      <NavIcon name="help" size={18} />
                      <span>Contact</span>
                      <NavIcon name="chevron" size={16} />
                    </Link>
                  </li>
                  <li>
                    <a href={WHATSAPP_CHANNEL_URL} target="_blank" rel="noopener noreferrer" onClick={close}>
                      <NavIcon name="chat" size={18} />
                      <span>WhatsApp Channel</span>
                      <NavIcon name="chevron" size={16} />
                    </a>
                  </li>
                </ul>
              </>
            )}

            <nav className={styles.footerLinks} aria-label="More from Daraja">
              {menu ? (
                <>
                  {menu.role === "JOB_SEEKER" ? (
                    <Link href={INTERNSHIPS_HREF} onClick={close}>Internships</Link>
                  ) : null}
                  <Link href="/about" onClick={close}>About</Link>
                  <a href={WHATSAPP_CHANNEL_URL} target="_blank" rel="noopener noreferrer" onClick={close}>
                    WhatsApp
                  </a>
                </>
              ) : null}
              <button type="button" onClick={openPrivacyChoices}>
                Privacy choices
              </button>
            </nav>
          </section>
        </div>
      )}

      <nav className={styles.dockWrap} aria-label="Mobile navigation">
        <div className={styles.dock} style={{ "--dock-item-count": tabs.length + 1 }}>
          {tabs.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.item} ${item.active ? styles.active : ""} ${item.primary ? styles.primary : ""}`}
              aria-current={item.active ? "page" : undefined}
              onClick={close}
            >
              <span className={styles.iconWrap}>
                <NavIcon name={item.icon} size={24} />
                {item.badge > 0 ? (
                  <span className={styles.badge} aria-hidden="true">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                ) : null}
              </span>
              <span className={styles.label}>{item.label}</span>
              {item.badge > 0 ? <span className="sr-only">, {item.badge} waiting</span> : null}
            </Link>
          ))}

          <button
            ref={sheetTabRef}
            type="button"
            className={`${styles.item} ${sheetOpen || sheetTabActive ? styles.active : ""}`}
            aria-expanded={sheetOpen}
            aria-haspopup="dialog"
            onClick={() => setSheetOpen((value) => !value)}
          >
            <span className={styles.iconWrap}>
              <NavIcon name={sheetTab.icon} size={24} />
            </span>
            <span className={styles.label}>{sheetTab.label}</span>
          </button>
        </div>
      </nav>
    </>
  );
}
