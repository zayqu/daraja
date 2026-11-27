import { signIn } from "@/auth";
import styles from "@/app/auth/auth.module.css";
import { getServerT } from "@/lib/i18n-server";
import LastUsed from "./LastUsed";

const ICONS = {
  google: (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.2 3.5-8.7Z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1Z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A11.6 11.6 0 0 0 12 0 12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9Z" />
    </svg>
  ),
  apple: (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M16.4 12.7c0-2.4 2-3.6 2.1-3.7a4.6 4.6 0 0 0-3.6-2c-1.5-.2-3 .9-3.8.9-.8 0-2-.9-3.3-.9a4.9 4.9 0 0 0-4.1 2.5c-1.8 3.1-.5 7.6 1.3 10 .8 1.2 1.8 2.6 3.1 2.5 1.2-.1 1.7-.8 3.2-.8 1.5 0 1.9.8 3.2.8 1.3 0 2.2-1.2 3-2.4.9-1.4 1.3-2.7 1.3-2.8 0 0-2.4-1-2.4-4ZM14 5.5c.7-.8 1.1-1.9 1-3-1 0-2.1.7-2.8 1.5-.6.7-1.2 1.8-1 2.9 1.1.1 2.1-.6 2.8-1.4Z" />
    </svg>
  ),
  linkedin: (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="#0A66C2" d="M20.4 2H3.6C2.7 2 2 2.7 2 3.6v16.8c0 .9.7 1.6 1.6 1.6h16.8c.9 0 1.6-.7 1.6-1.6V3.6c0-.9-.7-1.6-1.6-1.6ZM8 19H5V9.5h3V19ZM6.5 8.2a1.7 1.7 0 1 1 0-3.5 1.7 1.7 0 0 1 0 3.5ZM19 19h-3v-4.6c0-1.1 0-2.5-1.5-2.5s-1.8 1.2-1.8 2.4V19h-3V9.5h2.9v1.3c.4-.8 1.4-1.5 2.9-1.5 3 0 3.5 2 3.5 4.6V19Z" />
    </svg>
  ),
};

const LABELS = {
  google: "Continue with Google",
  apple: "Continue with Apple",
  linkedin: "Continue with LinkedIn",
};

// One owner for every social sign-in/sign-up button (Google, Apple, LinkedIn).
// The OAuth flow itself stays inside Auth.js.
export default async function ProviderButton({ provider, callbackUrl, label }) {
  const { t } = await getServerT();
  return (
    <LastUsed method={provider}>
      <form
        action={async () => {
          "use server";
          await signIn(provider, { redirectTo: callbackUrl });
        }}
      >
        <button className={`${styles.provider} ${styles[`provider_${provider}`] || ""}`} type="submit">
          <span className={styles.providerIcon}>{ICONS[provider]}</span>
          {t(label || LABELS[provider])}
        </button>
      </form>
    </LastUsed>
  );
}
