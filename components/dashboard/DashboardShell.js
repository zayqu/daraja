"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import NavIcon from "@/components/ui/NavIcon";
import DarajaLogo from "@/components/ui/DarajaLogo";
import LanguageSwitch from "@/components/LanguageSwitch";
import { ThemeToggle } from "@/components/ThemeControls";
import { signOutAction } from "@/app/actions/sign-out";
import { activeMenuHref, dashboardMenu } from "@/lib/dashboard-navigation";
import styles from "./DashboardShell.module.css";
import { useT } from "@/components/LanguageProvider";

// Employers get one card for the paid featured-vacancy product (D-036).
// Candidates have no promo: the Figma candidate menu already lists every tool.
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
  // The employer overview has its own featured-vacancy card, so the sidebar
  // one is left out there.
  const onHome = pathname === menu.home;
  const promo = !showPromo || onHome || (menu.role === "JOB_SEEKER" && !candidateCareer) ? null : PROMOS[menu.role];
  const profileHref =
    menu.role === "EMPLOYER"
      ? "/employer/profile"
      : menu.role === "JOB_SEEKER" && candidateCareer
        ? "/account/profile"
        : "/account/settings";

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar} aria-label={`${menu.roleLabel} menu`}>
        <Link href={menu.home} className={styles.brand} aria-label={t("Daraja home")}>
          <DarajaLogo />
        </Link>

        <p className={styles.navLabel}>{t(`${menu.roleLabel} menu`)}</p>
        <nav className={styles.nav} aria-label="Dashboard">
          {menu.main.map((item) => (
            <MenuLink key={item.href} item={item} active={item.href === activeHref} counts={counts} />
          ))}
        </nav>

        <nav className={`${styles.nav} ${styles.settingsNav}`} aria-label="Settings and support">
          {menu.settings.filter((item) => !item.inTopbar).map((item) => (
            <MenuLink key={item.href} item={item} active={item.href === activeHref} counts={counts} />
          ))}
        </nav>

        {promo ? (
          <div className={styles.promo}>
            <span className={styles.promoTag}>{t(promo.tag)}</span>
            <strong>{promo.title}</strong>
            <p>{t(promo.text)}</p>
            <Link href={promo.href} className={styles.promoAction}>
              {t(promo.cta)}
            </Link>
          </div>
        ) : null}

        <div className={styles.userCard}>
          <Link href={profileHref} className={styles.userLink} title={user?.email || undefined}>
            <span className={styles.avatar} aria-hidden="true">{user?.initials || "D"}</span>
            <span className={styles.userText}>
              <strong>{user?.name || "Daraja user"}</strong>
              <small>{t(menu.roleLabel)}</small>
            </span>
          </Link>
          <form action={signOutAction}>
            <button type="submit" className={styles.signOut} aria-label={t("Sign out")} title={t("Sign out")}>
              <NavIcon name="logout" size={20} />
            </button>
          </form>
        </div>
      </aside>

      <div className={styles.body}>
        <header className={styles.topbar}>
          <Link href={menu.home} className={styles.mobileBrand} aria-label={t("Daraja home")}>
            <DarajaLogo />
          </Link>

          <form className={styles.search} action={menu.search.action} role="search">
            <NavIcon name="search" size={18} />
            <input
              type="search"
              name={menu.search.name}
              placeholder={t(menu.search.placeholder)}
              aria-label={t(menu.search.placeholder)}
            />
          </form>

          <div className={styles.topActions}>
            <LanguageSwitch className={styles.desktopOnly} />
            <ThemeToggle className={styles.desktopOnly} />
            {menu.role !== "ADMIN" ? (
              <Link href="/" className={`${styles.viewSite} ${styles.desktopOnly}`}>{t("View site")}</Link>
            ) : null}
            {notificationsHref ? (
              <Link href={notificationsHref} className={styles.iconButton} aria-label={t("Notifications")} title={t("Notifications")}>
                <NavIcon name="bell" size={20} />
              </Link>
            ) : null}
            <Link href="/contact" className={`${styles.iconButton} ${styles.desktopOnly}`} aria-label={t("Help & support")} title={t("Help & support")}>
              <NavIcon name="help" size={20} />
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
