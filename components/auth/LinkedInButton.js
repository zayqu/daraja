import { signIn } from "@/auth";
import styles from "@/app/auth/auth.module.css";
import { getServerT } from "@/lib/i18n-server";

export default async function LinkedInButton({
  callbackUrl,
  label = "Continue with LinkedIn",
  withDivider = true,
}) {
  const { t } = await getServerT();
  return (
    <>
      <form
        className={styles.form}
        action={async () => {
          "use server";
          await signIn("linkedin", { redirectTo: callbackUrl });
        }}
      >
        <button className={styles.google} type="submit">
          {t(label)}
        </button>
      </form>
      {withDivider ? (
        <div className={styles.divider}><span>{t("or use your email")}</span></div>
      ) : null}
    </>
  );
}
