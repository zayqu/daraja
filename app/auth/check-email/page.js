import Link from "next/link";
import AuthLayout from "@/components/auth/AuthLayout";
import EmailRequestForm from "@/components/auth/EmailRequestForm";
import styles from "../auth.module.css";

export const metadata = {
  title: "Confirm your email | Daraja",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function CheckEmailPage({ searchParams }) {
  const params = await searchParams;
  const email = typeof params?.email === "string" ? params.email.slice(0, 254) : "";
  return (
    <AuthLayout
      title="Almost there."
      intro="Confirm your email address to activate your Daraja account."
    >
      <h2>Check your email</h2>
      <p className={styles.lead}>
        We sent a confirmation link{email ? ` to ${email}` : ""}. Open it on this device
        to finish creating your account. The link expires in 24 hours.
      </p>
      <p className={styles.hint}>Did not get it? Check your spam folder, or send it again.</p>
      <EmailRequestForm
        endpoint="/api/account/resend-verification"
        buttonLabel="Send the link again"
        initialEmail={email}
      />
      <p className={styles.switchRow}>
        Already confirmed? <Link href="/auth/signin">Sign in</Link>
      </p>
    </AuthLayout>
  );
}
