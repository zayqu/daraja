import Link from "next/link";
import AuthLayout from "@/components/auth/AuthLayout";
import EmailRequestForm from "@/components/auth/EmailRequestForm";
import styles from "../auth.module.css";

export const metadata = {
  title: "Reset password | Daraja",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <AuthLayout
      title="Forgot your password?"
      intro="It happens. We will email you a secure link to choose a new one."
    >
      <h2>Reset your password</h2>
      <p className={styles.lead}>
        Enter the email you use for Daraja. If you used to sign in with an email
        link, this also lets you set a password.
      </p>
      <EmailRequestForm endpoint="/api/account/forgot-password" buttonLabel="Email me a reset link" />
      <p className={styles.switchRow}>
        Remembered it? <Link href="/auth/signin">Back to sign in</Link>
      </p>
    </AuthLayout>
  );
}
