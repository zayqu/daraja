"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import NavIcon from "@/components/ui/NavIcon";
import { signOutAction } from "@/app/actions/sign-out";
import { activeMenuHref, dashboardMenu } from "@/lib/dashboard-navigation";
import styles from "./DashboardShell.module.css";
import { useT } from "@/components/LanguageProvider";

// One promotional card per role, linking to real Daraja products only.
// Candidates are never charged (D-036), so theirs points to a free tool.
const PROMOS = {
  EMPLOYER: {
    tag: "Featured job",
    title: (
      <>
        Get your vacancy <em>seen first</em>
      </>
    ),
    text: "Feature it on Ajira and the DARAJA WhatsApp Channel.",
    cta: "Feature a vacancy",
    href: "/advertise",
  },
  JOB_SEEKER: {
    tag: "Free",
    title: (
      <>
        Stand out with an <em>ATS-ready CV</em>
      </>
    ),
    text: "Build your CV once, then tailor it for each job.",
    cta: "Open CV Builder",
    href: "/account/career/cv",
  },
};

function MenuLink({ item, active, counts }) {
  const t = useT();
  const count = item.count ? counts[item.count] : 0;
  return (
    <Link
      href={item.href}
      className={`${styles.navLink} ${active ? styles.navActive : ""}`}
      aria-current={active ? "page" : undefined}
    >
      <NavIcon name={item.icon} size={20} />
      <span>{t(item.label)}</span>
      {count ? <span className={styles.navCount}>{count > 99 ? "99+" : count}</span> : null}
    </Link>
  );
}

export default function DashboardShell({
  role,
  employerPortal = false,
  candidateCareer = false,
  user,
  counts = {},
  notificationsHref = null,
  showPromo = true,
  children,
}) {
  const t = useT();
  const pathname = usePathname() || "";
  const menu = dashboardMenu(role, { employerPortal, candidateCareer });
  const activeHref = activeMenuHref([...menu.main, ...menu.settings], pathname);
  const promo = !showPromo || (menu.role === "JOB_SEEKER" && !candidateCareer) ? null : PROMOS[menu.role];
  const profileHref =
    menu.role === "EMPLOYER"
      ? "/employer/profile"
      : menu.role === "JOB_SEEKER" && candidateCareer
        ? "/account/profile"
        : "/account/settings";

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar} aria-label={`${menu.roleLabel} menu`}>
        <Link href={menu.home} className={styles.brand}>
          DARAJA
          <small>{menu.roleLabel} dashboard</small>
        </Link>

        <nav className={styles.nav} aria-label="Dashboard">
          {menu.main.map((item) => (
            <MenuLink key={item.href} item={item} active={item.href === activeHref} counts={counts} />
          ))}
        </nav>

        <p className={styles.navLabel}>{t("Settings")}</p>
        <nav className={`${styles.nav} ${styles.settingsNav}`} aria-label="Settings and support">
          {menu.settings.map((item) => (
            <MenuLink key={item.href} item={item} active={item.href === activeHref} counts={counts} />
          ))}
          <form action={signOutAction}>
            <button type="submit" className={styles.navLink}>
              <NavIcon name="logout" size={20} />
              <span>{t("Sign out")}</span>
            </button>
          </form>
        </nav>

        {promo ? (
          <div className={styles.promo}>
            <span className={styles.promoTag}>{promo.tag}</span>
            <strong>{promo.title}</strong>
            <p>{promo.text}</p>
            <Link href={promo.href} className={styles.promoAction}>
              {promo.cta}
            </Link>
          </div>
        ) : null}
      </aside>

      <div className={styles.body}>
        <header className={styles.topbar}>
          <Link href={menu.home} className={styles.mobileBrand}>
            DARAJA
            <small>{menu.roleLabel}</small>
          </Link>

          <form className={styles.search} action={menu.search.action} role="search">
            <NavIcon name="search" size={18} />
            <input
              type="search"
              name={menu.search.name}
              placeholder={menu.search.placeholder}
              aria-label={menu.search.placeholder}
            />
          </form>

          <div className={styles.topActions}>
            {notificationsHref ? (
              <Link href={notificationsHref} className={styles.iconButton} aria-label={t("Notifications")} title={t("Notifications")}>
                <NavIcon name="bell" size={20} />
              </Link>
            ) : null}
            <Link href={profileHref} className={styles.userChip} title={user?.email || undefined}>
              <span className={styles.avatar} aria-hidden="true">{user?.initials || "D"}</span>
              <span className={styles.userText}>
                <strong>{user?.name || "Daraja user"}</strong>
                <small>{menu.roleLabel}</small>
              </span>
            </Link>
          </div>
        </header>

        <main id="main-content" className={styles.main}>
          {children}
        </main>
      </div>
    </div>
  );
}
