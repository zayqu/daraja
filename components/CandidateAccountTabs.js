import Link from "next/link";
import styles from "./CandidateAccountTabs.module.css";

export default function CandidateAccountTabs({ showCareer = false }) {
  const links = [
    ...(showCareer ? [{ href: "/account/career", label: "Career workspace" }] : []),
    { href: "/account/alerts", label: "Job alerts" },
    { href: "/account/privacy", label: "Privacy & data" },
  ];

  return (
    <nav className={styles.tabs} aria-label="Candidate account">
      {links.map((link) => (
        <Link key={link.href} href={link.href}>
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
