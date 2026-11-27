"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { LOCALE_COOKIE } from "@/lib/i18n";
import { useLocale } from "@/components/LanguageProvider";
import styles from "./ThemeControls.module.css";

const OPTIONS = [
  ["en", "EN", "English"],
  ["sw", "SW", "Kiswahili"],
];

function saveLanguage(value) {
  document.cookie = `${LOCALE_COOKIE}=${value}; path=/; max-age=31536000; samesite=lax`;
  document.documentElement.lang = value;
}

// EN | SW switch (D-039). Saves the choice for a year and re-renders the page.
export default function LanguageSwitch({ full = false, className = "" }) {
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function choose(value) {
    if (value === locale) return;
    saveLanguage(value);
    startTransition(() => router.refresh());
  }

  return (
    <div
      className={`${full ? styles.segmented : styles.pill} ${className}`}
      role="radiogroup"
      aria-label="Language / Lugha"
      aria-busy={pending}
    >
      {OPTIONS.map(([value, short, long]) => (
        <button
          key={value}
          type="button"
          role="radio"
          lang={value}
          aria-checked={locale === value}
          aria-label={long}
          className={locale === value ? styles.selected : undefined}
          onClick={() => choose(value)}
        >
          {full ? long : short}
        </button>
      ))}
    </div>
  );
}
