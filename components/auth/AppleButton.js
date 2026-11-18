import { signIn } from "@/auth";
import styles from "@/app/auth/auth.module.css";

// Apple is shown only after the server has explicitly enabled a configured
// and verified provider. The OAuth flow itself stays inside Auth.js.
export default function AppleButton({
  callbackUrl,
  label = "Continue with Apple",
  withDivider = false,
}) {
  return (
    <>
      <form
        className={styles.form}
        action={async () => {
          "use server";
          await signIn("apple", { redirectTo: callbackUrl });
        }}
      >
        <button className={styles.apple} type="submit">
          {label}
        </button>
      </form>
      {withDivider ? (
        <div className={styles.divider}><span>or use your email</span></div>
      ) : null}
    </>
  );
}
