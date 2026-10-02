import Link from "next/link";
import styles from "./WorkspaceTabs.module.css";

export default function WorkspaceTabs({ links, label }) {
  return (
    <nav className={styles.tabs} aria-label={label}>
      {links.map((link) => (
        <Link key={link.href} href={link.href}>
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
