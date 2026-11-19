import Link from "next/link";
import NavIcon from "@/components/ui/NavIcon";
import styles from "./dashboard.module.css";

// The gear button on the Profile/Account page (Makarya pattern): a small menu
// with Edit and Account settings. A native <details> element, so it works and
// is keyboard accessible without extra JavaScript.
export default function ProfileMenu({ items }) {
  return (
    <details className={styles.gearMenu}>
      <summary aria-label="Profile options" title="Profile options">
        <NavIcon name="settings" size={20} />
      </summary>
      <div className={styles.gearMenuList}>
        {items.map((item) => (
          <Link key={item.href} href={item.href}>
            <NavIcon name={item.icon} size={18} />
            <span>{item.label}</span>
          </Link>
        ))}
      </div>
    </details>
  );
}
