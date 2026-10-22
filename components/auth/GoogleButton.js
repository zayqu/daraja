import { signIn } from "@/auth";
import styles from "@/app/auth/auth.module.css";

// Server-rendered "Continue with Google" with the "or" divider under it.
export default function GoogleButton({ callbackUrl, label = "Continue with Google" }) {
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
          {label}
        </button>
      </form>
      <div className={styles.divider}><span>or use your email</span></div>
    </>
  );
}
