import { dashboardMenu, secondaryMenuSections } from "@/lib/dashboard-navigation";
import { candidateCareerEnabled, employerPortalEnabled } from "@/lib/features";
import { DarajaLinks, MenuSections, SignOutButton } from "@/components/ui/MenuList";
import styles from "./dashboard.module.css";

// Phones only: the bottom of the Profile/Account page lists the rest of the
// role's menu (the desktop sidebar already shows it) and ends with Sign out
// (D-038). `signOut={false}` where the page has its own Sign out section.
export default function AccountMenu({ role, signOut = true }) {
  const menu = dashboardMenu(role, {
    employerPortal: employerPortalEnabled(),
    candidateCareer: candidateCareerEnabled(),
  });
  return (
    <section className={styles.accountMenu} aria-label="Account menu">
      <MenuSections sections={secondaryMenuSections(menu)} />
      <DarajaLinks showInternships={menu.role === "JOB_SEEKER"} />
      {signOut ? <SignOutButton /> : null}
    </section>
  );
}
