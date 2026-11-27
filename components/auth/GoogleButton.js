import { signIn } from "@/auth";
import styles from "@/app/auth/auth.module.css";
import { getServerT } from "@/lib/i18n-server";

// Server-rendered "Continue with Google" with the "or" divider under it.
export default async function GoogleButton({ callbackUrl, label = "Continue with Google" }) {
  const { t } = await getServerT();
  return (
    <>
      <form
        className={styles.form}
        action={async () => {
          "use server";
          await signIn("google", { redirectTo: callbackUrl });
        }}
      >
        <button className={styles.google} type="submit">
          {t(label)}
        </button>
      </form>
      <div className={styles.divider}><span>{t("or use your email")}</span></div>
    </>
  );
}
