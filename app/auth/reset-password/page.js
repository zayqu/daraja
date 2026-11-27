import AuthLayout from "@/components/auth/AuthLayout";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";
import styles from "../auth.module.css";

export const metadata = {
  title: "Choose a new password",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({ searchParams }) {
  const params = await searchParams;
  const email = typeof params?.email === "string" ? params.email : "";
  const token = typeof params?.token === "string" ? params.token : "";
  return (
    <AuthLayout>
      <h1 className={styles.title}>New password</h1>
      <p className={styles.lead}>{email ? `For ${email}` : "Set a new password for your account."}</p>
      <ResetPasswordForm email={email} token={token} />
    </AuthLayout>
  );
}
