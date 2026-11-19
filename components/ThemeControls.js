"use client";

import { useSyncExternalStore } from "react";
import NavIcon from "@/components/ui/NavIcon";
import { useT } from "@/components/LanguageProvider";
import styles from "./ThemeControls.module.css";

// Light/dark appearance (D-039). "system" follows the device; "light" and
// "dark" are saved on this browser and applied by the inline script in
// app/layout.js before the page paints, so there is no white flash.
export const THEME_STORAGE_KEY = "daraja-theme";
const CHOICES = [
  ["system", "Device"],
  ["light", "Light"],
  ["dark", "Dark"],
];

function readChoice() {
  try {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    return saved === "light" || saved === "dark" ? saved : "system";
  } catch {
    return "system";
  }
}

const CHANGE_EVENT = "daraja-theme-change";

function subscribe(onChange) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    media.removeEventListener("change", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function applyChoice(choice) {
  const root = document.documentElement;
  if (choice === "system") delete root.dataset.theme;
  else root.dataset.theme = choice;
  try {
    if (choice === "system") window.localStorage.removeItem(THEME_STORAGE_KEY);
    else window.localStorage.setItem(THEME_STORAGE_KEY, choice);
  } catch {
    // Private browsing: the choice still applies to this page.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function isDarkNow() {
  const forced = document.documentElement.dataset.theme;
  if (forced) return forced === "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

// One-tap switch for headers: shows a sun in dark mode and a moon in light mode.
export function ThemeToggle({ className = "" }) {
  const t = useT();
  const dark = useSyncExternalStore(subscribe, isDarkNow, () => false);

  return (
    <button
      type="button"
      className={`${styles.toggle} ${className}`}
      aria-label={t(dark ? "Switch to light mode" : "Switch to dark mode")}
      title={t(dark ? "Light" : "Dark")}
      onClick={() => {
        applyChoice(dark ? "light" : "dark");
      }}
    >
      <NavIcon name={dark ? "sun" : "moon"} size={20} />
    </button>
  );
}

// Three-way choice for Account settings.
export function AppearanceSetting() {
  const t = useT();
  const choice = useSyncExternalStore(subscribe, readChoice, () => "system");

  return (
    <div className={styles.segmented} role="radiogroup" aria-label={t("Appearance")}>
      {CHOICES.map(([value, label]) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={choice === value}
          className={choice === value ? styles.selected : undefined}
          onClick={() => applyChoice(value)}
        >
          {t(label)}
        </button>
      ))}
    </div>
  );
}
