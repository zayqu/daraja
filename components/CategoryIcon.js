// Line icons and colour tones for the controlled job categories
// (lib/job-categories.js). Every category must have an entry here;
// test/home-categories.test.js enforces it.

import { categorySlug } from "@/lib/job-categories";

const ICONS = {
  Government: (
    <>
      <path d="M3 21h18M5 21V10M19 21V10M9 21v-7M15 21v-7" />
      <path d="M2 10 12 4l10 6Z" />
    </>
  ),
  "NGO & Development": (
    <>
      <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" />
    </>
  ),
  "Banking & Finance": (
    <>
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M3 10h18M7 15h3" />
    </>
  ),
  Technology: (
    <>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4M9 8l-2 2 2 2M15 8l2 2-2 2" />
    </>
  ),
  "Creative, Design & Media": (
    <>
      <path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.5-.8 1.5-1.5 0-1.2-1-1.5-1-2.5S13.3 15 14.5 15H17a4 4 0 0 0 4-4c0-4.4-4-8-9-8Z" />
      <circle cx="7.5" cy="11" r="1" />
      <circle cx="10" cy="7" r="1" />
      <circle cx="15" cy="7.5" r="1" />
    </>
  ),
  Health: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <path d="M12 8v8M8 12h8" />
    </>
  ),
  Education: (
    <>
      <path d="m2 9 10-5 10 5-10 5Z" />
      <path d="M6 11v5c3 2.5 9 2.5 12 0v-5M22 9v6" />
    </>
  ),
  Engineering: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M4.9 4.9 7 7M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1" />
    </>
  ),
  "Sales & Marketing": (
    <>
      <path d="M3 11v2a1 1 0 0 0 1 1h3l6 4V6L7 10H4a1 1 0 0 0-1 1Z" />
      <path d="M17 9a4 4 0 0 1 0 6M19.5 6.5a8 8 0 0 1 0 11" />
    </>
  ),
  "Accounting & Audit": (
    <>
      <rect x="5" y="2" width="14" height="20" rx="2" />
      <path d="M8 6h8M8 11h2M14 11h2M8 15h2M14 15h2M8 19h2M14 19h2" />
    </>
  ),
  "HR & Administration": (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6" />
    </>
  ),
  Legal: (
    <>
      <path d="M12 3v18M7 21h10M4 7h16M4 7l-2.5 6a3 3 0 0 0 5 0ZM20 7l-2.5 6a3 3 0 0 0 5 0Z" />
    </>
  ),
  "Logistics & Transport": (
    <>
      <path d="M2 6h11v10H2ZM13 9h4l4 4v3h-8" />
      <circle cx="6" cy="18" r="2" />
      <circle cx="17" cy="18" r="2" />
    </>
  ),
  "Hospitality & Tourism": (
    <>
      <path d="M4 20V10a8 8 0 0 1 16 0v10M2 20h20M12 2v2" />
    </>
  ),
  Agriculture: (
    <>
      <path d="M12 22V10M12 14c-4 0-7-3-7-7 4 0 7 3 7 7ZM12 11c0-4 3-7 7-7 0 4-3 7-7 7Z" />
    </>
  ),
  "Mining, Energy, Oil & Gas": (
    <>
      <path d="M13 2 4 14h7l-1 8 9-12h-7Z" />
    </>
  ),
  Manufacturing: (
    <>
      <path d="M2 21V10l6 4V10l6 4V6h4l2 15Z" />
      <path d="M2 21h20" />
    </>
  ),
  "Construction & Real Estate": (
    <>
      <path d="M3 21V9l9-6 9 6v12Z" />
      <path d="M9 21v-6h6v6" />
    </>
  ),
  "Security & Protective Services": (
    <>
      <path d="M12 2 4 5v6c0 5 3.4 9.3 8 11 4.6-1.7 8-6 8-11V5Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  "Internships & Graduate Programs": (
    <>
      <path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2ZM9 21h6" />
    </>
  ),
  General: (
    <>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18" />
    </>
  ),
};

// Soft tile background / icon colour pairs. Mid-saturation tones that sit
// next to the teal brand accent without competing with it.
const TONES = [
  { bg: "#e6f8f4", fg: "#087f6c" },
  { bg: "#eaf1fe", fg: "#2c5bc4" },
  { bg: "#fdf0e3", fg: "#b45309" },
  { bg: "#f3ecfd", fg: "#6d3fc0" },
  { bg: "#fde9ee", fg: "#b42352" },
  { bg: "#e8f6ea", fg: "#2f7d3a" },
  { bg: "#e7f4f9", fg: "#0e6e8c" },
  { bg: "#fbf3d9", fg: "#8a6400" },
];

export const CATEGORY_ICON_NAMES = Object.keys(ICONS);

export function categoryTone(index) {
  return TONES[index % TONES.length];
}

// Icons follow the category's stable slug too, so a category renamed in
// /admin/categories keeps its icon; new categories use the General icon.
const ICONS_BY_SLUG = Object.fromEntries(
  Object.entries(ICONS).map(([name, glyph]) => [categorySlug(name), glyph])
);

export default function CategoryIcon({ category, slug = categorySlug(category), size = 22 }) {
  const glyph = ICONS[category] || ICONS_BY_SLUG[slug] || ICONS.General;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {glyph}
    </svg>
  );
}
