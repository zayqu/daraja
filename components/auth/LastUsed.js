"use client";

import { useSyncExternalStore } from "react";
import styles from "@/app/auth/auth.module.css";
import { useT } from "@/components/LanguageProvider";

const STORAGE_KEY = "daraja:last-sign-in";

// Remembers (on this device only) which sign-in method was used last and
// marks it with a "Last used" badge. Nothing is sent to the server.
export function rememberSignInMethod(method) {
  try {
    window.localStorage.setItem(STORAGE_KEY, method);
  } catch {
    // Private mode or blocked storage: the badge is a convenience only.
  }
}

function readLastMethod() {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

// The stored value only changes when the person leaves the page to sign in,
// so there is nothing to subscribe to; the server render shows no badge.
const noSubscription = () => () => {};

export default function LastUsed({ method, children }) {
  const t = useT();
  const isLast = useSyncExternalStore(noSubscription, readLastMethod, () => null) === method;

  return (
    <div className={styles.method} onClickCapture={() => rememberSignInMethod(method)}>
      {children}
      {isLast ? <span className={styles.lastUsed}>{t("Last used")}</span> : null}
    </div>
  );
}
