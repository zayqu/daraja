// Bilingual interface (D-039): English and Kiswahili.
// Keys are the English text, so anything not yet translated simply shows in
// English. Add a Kiswahili line here instead of hard-coding it in a component.
// Translations must be checked by a fluent Kiswahili speaker before launch.

export const LOCALES = ["en", "sw"];
export const DEFAULT_LOCALE = "en";
export const LOCALE_COOKIE = "daraja-lang";

const SW = {
  // Navigation and menus
  Home: "Mwanzo",
  Jobs: "Kazi",
  Freelance: "Kazi huru",
  "CV Builder": "Tengeneza CV",
  Employers: "Waajiri",
  About: "Kuhusu",
  Account: "Akaunti",
  Admin: "Msimamizi",
  Alerts: "Arifa",
  Candidate: "Mtafuta kazi",
  Categories: "Makundi",
  "Company profile": "Wasifu wa kampuni",
  Contact: "Wasiliana nasi",
  Dashboard: "Dashibodi",
  Discover: "Gundua",
  Employer: "Mwajiri",
  Freelancer: "Mfanyakazi huru",
  "Find jobs": "Tafuta kazi",
  "Free account needed": "Akaunti ya bure inahitajika",
  "Help & support": "Msaada",
  Internships: "Mafunzo kazini",
  "Job alerts": "Arifa za kazi",
  More: "Zaidi",
  "My account": "Akaunti yangu",
  "My jobs": "Kazi zangu",
  "My profile": "Wasifu wangu",
  "My vacancies": "Nafasi zangu",
  Notifications: "Taarifa",
  Overview: "Muhtasari",
  "Post a job": "Tangaza kazi",
  "Post a Job": "Tangaza kazi",
  "Post job": "Tangaza kazi",
  Profile: "Wasifu",
  "Search jobs": "Tafuta kazi",
  "Search jobs on Daraja": "Tafuta kazi Daraja",
  "Search jobs in admin": "Tafuta kazi",
  Settings: "Mipangilio",
  "Site settings": "Mipangilio ya tovuti",
  Sources: "Vyanzo",
  Users: "Watumiaji",
  Vacancies: "Nafasi za kazi",
  "View the site": "Tazama tovuti",
  Messages: "Ujumbe",
  Community: "Jamii",
  Menu: "Menyu",
  "Daraja menu": "Menyu ya Daraja",
  "Close menu": "Funga menyu",
  "Open menu": "Fungua menyu",

  // Account
  "Skip to main content": "Ruka hadi maudhui",
  "Sign in": "Ingia",
  "Sign out": "Toka",
  "Create account": "Fungua akaunti",
  "Your account": "Akaunti yako",
  "About Daraja": "Kuhusu Daraja",
  "WhatsApp Channel": "Chaneli ya WhatsApp",
  "Privacy choices": "Chaguo za faragha",
  "Editorial Policy": "Sera ya uhariri",
  Privacy: "Faragha",
  Terms: "Masharti",

  // Search
  "Search job title or company": "Tafuta jina la kazi au kampuni",
  Search: "Tafuta",

  // Appearance and language
  Appearance: "Mwonekano",
  Device: "Kifaa",
  Light: "Mwanga",
  Dark: "Giza",
  Language: "Lugha",
  "Switch to dark mode": "Badili kwenda giza",
  "Switch to light mode": "Badili kwenda mwanga",
  "Use your device setting, or always light or dark.": "Fuata mpangilio wa kifaa chako, au chagua mwanga au giza kila wakati.",
  "Choose the language for menus and pages.": "Chagua lugha ya menyu na kurasa.",
};

const MESSAGES = { en: {}, sw: SW };

export function normalizeLocale(value) {
  return LOCALES.includes(value) ? value : DEFAULT_LOCALE;
}

export function translate(locale, text) {
  if (!text) return text;
  return MESSAGES[normalizeLocale(locale)][text] || text;
}
