import { signIn } from "@/auth";
import styles from "@/app/auth/auth.module.css";

export default function LinkedInButton({
  callbackUrl,
  label = "Continue with LinkedIn",
  withDivider = true,
}) {
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
          {label}
        </button>
      </form>
      {withDivider ? (
        <div className={styles.divider}><span>or use your email</span></div>
      ) : null}
    </>
  );
}
