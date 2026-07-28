import Link from "next/link";

const links = [
  ["About", "/about"],
  ["Editorial Policy", "/editorial-policy"],
  ["Contact", "/contact"],
  ["Privacy", "/privacy"],
  ["Terms", "/terms"],
];

export default function SiteFooterLinks() {
  return (
    <nav className="site-footer-links" aria-label="Company and legal information">
      {links.map(([label, href]) => (
        <Link key={href} href={href}>{label}</Link>
      ))}
    </nav>
  );
}
