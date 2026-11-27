"use client";

import { useState } from "react";
import styles from "@/app/auth/auth.module.css";
import { useT } from "@/components/LanguageProvider";
import LastUsed from "./LastUsed";

// Email sign-in/sign-up stays behind one "Continue with email" button so the
// page leads with the one-tap options; the fields appear only when asked for.
export default function EmailOption({ label = "Continue with email", defaultOpen = false, children }) {
  const t = useT();
  const [open, setOpen] = useState(defaultOpen);

  if (open) return <div className={styles.emailPanel}>{children}</div>;

  return (
    <LastUsed method="email">
      <button type="button" className={styles.provider} onClick={() => setOpen(true)} aria-expanded="false">
        <span className={styles.providerIcon}>
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h15A1.5 1.5 0 0 1 21 6.5v11a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5v-11Zm1.5.2 7.5 5.6 7.5-5.6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        {t(label)}
      </button>
    </LastUsed>
  );
}
