"use client";

import { createContext, useContext } from "react";
import { DEFAULT_LOCALE, translate } from "@/lib/i18n";

const LanguageContext = createContext(DEFAULT_LOCALE);

// The root layout reads the language cookie and passes it here, so client
// components translate on the server render too (no English flash).
export function LanguageProvider({ locale, children }) {
  return <LanguageContext.Provider value={locale}>{children}</LanguageContext.Provider>;
}

export function useLocale() {
  return useContext(LanguageContext);
}

export function useT() {
  const locale = useContext(LanguageContext);
  return (text) => translate(locale, text);
}
