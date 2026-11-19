"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { mobileDockEnabledPath } from "@/lib/mobile-navigation";
import { activeMenuHref, dashboardMenu, secondaryMenuSections } from "@/lib/dashboard-navigation";
import NavIcon from "@/components/ui/NavIcon";
import LanguageSwitch from "@/components/LanguageSwitch";
import { useT } from "@/components/LanguageProvider";
import { DarajaLinks, INTERNSHIPS_HREF, MenuRows, MenuSections, SignOutButton } from "@/components/ui/MenuList";
import styles from "./MobileDock.module.css";

// Visitors need an account for job alerts, so the row says so and signs in first.
const GUEST_ROWS = [
  {
    href: "/auth/signin?callbackUrl=/account/alerts",
    label: "Job alerts",
    hint: "Free account needed",
    icon: "alert",
  },
  { href: INTERNSHIPS_HREF, label: "Internships", icon: "internships" },
  { href: "/contact", label: "Contact", icon: "help" },
];

// Phone navigation (D-027, D-038). Every tab goes straight to a page except
// More, the only tab that opens a menu (admins and visitors). Candidates and
// employers find the rest of their menu on their Profile/Account page.
// Desktop uses the dashboard sidebar instead.
export default function MobileDock({
  showEmployerCta = false,
  showCandidateProfile = false,
  userRole = null,
  userName = null,
  counts = null,
}) {
  const t = useT();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [sheetOpen, setSheetOpen] = useState(false);
  const closeButtonRef = useRef(null);
  const moreButtonRef = useRef(null);
  const freelanceActive =
    pathname.startsWith("/jobs") && searchParams.get("type") === "FREELANCE";

  useEffect(() => {
    if (!sheetOpen) return undefined;
    closeButtonRef.current?.focus();
    const moreButton = moreButtonRef.current;

    function onKeyDown(event) {
      if (event.key === "Escape") setSheetOpen(false);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      moreButton?.focus();
    };
  }, [sheetOpen]);

  if (!mobileDockEnabledPath(pathname)) return null;

  const close = () => setSheetOpen(false);
  const menu = userRole
    ? dashboardMenu(userRole, { employerPortal: showEmployerCta, candidateCareer: showCandidateProfile })
    : null;

  let tabs;
  let activeHref = null;
  let accountAreaActive = false;
  if (menu) {
    // The home page belongs to no tab (it is only the admin's "View the site").
    activeHref = activeMenuHref(
      [...menu.dock, ...menu.main, ...menu.settings].filter((item) => item.href !== "/"),
      pathname
    );
    // Any menu page outside the dock belongs to the Profile/Account/More tab.
    accountAreaActive =
      pathname === menu.accountTab.href ||
      (Boolean(activeHref) && !menu.dock.some((item) => item.href === activeHref));
    tabs = menu.dock.map((item) => ({
      ...item,
      active: item.href === activeHref,
      badge: item.count ? Number(counts?.[item.count] || 0) : 0,
    }));
    if (menu.accountTab.href) tabs.push({ ...menu.accountTab, active: accountAreaActive });
  } else {
    tabs = [
      { href: "/", label: "Home", icon: "home", active: pathname === "/" },
      { href: "/jobs", label: "Jobs", icon: "jobs", active: pathname.startsWith("/jobs") && !freelanceActive },
      { href: "/jobs?type=FREELANCE", label: "Freelance", icon: "freelance", active: freelanceActive },
    ];
  }
  const hasMore = !menu || !menu.accountTab.href;

  return (
    <>
      <div className={styles.spacer} aria-hidden="true" />

      {hasMore && sheetOpen && (
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
            aria-label={menu ? `${t(menu.roleLabel)} · ${t("Menu")}` : t("Daraja menu")}
          >
            <div className={styles.sheetHandle} aria-hidden="true" />
            <div className={styles.sheetHeader}>
              <div className={styles.identity}>
                <strong>{menu ? userName || t("Your account") : "Daraja"}</strong>
                <span>{menu ? t(menu.roleLabel) : "Kazi na fursa Tanzania"}</span>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                className={styles.closeButton}
                aria-label={t("Close menu")}
                onClick={close}
              >
                <NavIcon name="close" size={18} />
              </button>
            </div>

            {menu ? (
              <>
                <MenuSections
                  sections={secondaryMenuSections(menu)}
                  activeHref={activeHref}
                  onNavigate={close}
                  compactSettings
                />
                <LanguageSwitch full />
                <DarajaLinks onNavigate={close} />
                <SignOutButton />
              </>
            ) : (
              <>
                <div className={styles.authActions}>
                  <Link href="/auth/signin" className={styles.authPrimary} onClick={close}>
                    {t("Sign in")}
                  </Link>
                  <Link href="/auth/signup" className={styles.authSecondary} onClick={close}>
                    {t("Create account")}
                  </Link>
                </div>
                <MenuRows items={GUEST_ROWS} onNavigate={close} />
                <LanguageSwitch full />
                <DarajaLinks onNavigate={close} />
              </>
            )}
          </section>
        </div>
      )}

      <nav className={styles.dockWrap} aria-label="Mobile navigation">
        <div className={styles.dock} style={{ "--dock-item-count": tabs.length + (hasMore ? 1 : 0) }}>
          {tabs.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.item} ${item.active ? styles.active : ""} ${item.primary ? styles.primary : ""}`}
              aria-current={item.active ? "page" : undefined}
              onClick={close}
            >
              <span className={styles.iconWrap}>
                <NavIcon name={item.icon} size={item.primary ? 22 : 24} />
                {item.badge > 0 ? (
                  <span className={styles.badge} aria-hidden="true">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                ) : null}
              </span>
              <span className={styles.label}>{t(item.label)}</span>
              {item.badge > 0 ? <span className="sr-only">, {item.badge} waiting</span> : null}
            </Link>
          ))}

          {hasMore ? (
            <button
              ref={moreButtonRef}
              type="button"
              className={`${styles.item} ${sheetOpen || accountAreaActive ? styles.active : ""}`}
              aria-expanded={sheetOpen}
              aria-haspopup="dialog"
              onClick={() => setSheetOpen((value) => !value)}
            >
              <span className={styles.iconWrap}>
                <NavIcon name="more" size={24} />
              </span>
              <span className={styles.label}>{t("More")}</span>
            </button>
          ) : null}
        </div>
      </nav>
    </>
  );
}
