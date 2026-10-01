import Link from "next/link";
import styles from "./EmployerPortalTabs.module.css";

export default function EmployerPortalTabs({ showAdmin = false }) {
  const links = [
    { href: "/employer", label: "Employer workspace" },
    { href: "/post-job", label: "Create vacancy" },
    ...(showAdmin ? [{ href: "/admin", label: "Moderation" }] : []),
  ];

  return (
    <nav className={styles.tabs} aria-label="Employer workspace">
      {links.map((link) => (
        <Link key={link.href} href={link.href}>
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
