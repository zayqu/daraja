"use client";

import Link from "next/link";
import { useT } from "@/components/LanguageProvider";

const links = [
  ["About", "/about"],
  ["Editorial Policy", "/editorial-policy"],
  ["Contact", "/contact"],
  ["Privacy", "/privacy"],
  ["Terms", "/terms"],
];

export default function SiteFooterLinks() {
  const t = useT();
  return (
    <nav className="site-footer-links" aria-label="Company and legal information">
      {links.map(([label, href]) => (
        <Link key={href} href={href}>{t(label)}</Link>
      ))}
    </nav>
  );
}
