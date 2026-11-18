import Link from "next/link";
import { Notice } from "@/components/dashboard/DashboardUi";
import styles from "@/components/dashboard/dashboard.module.css";

// What an employer's verification status means for them, with the next step.
// Verified employers get no notice.
export default function EmployerVerificationNotice({ employer, showProfileLink = true }) {
  const status = employer?.verificationStatus;
  const note = employer?.verificationNote ? `Daraja's note: ${employer.verificationNote}` : null;
  const profileLink = showProfileLink ? (
    <Link className={styles.linkArrow} href="/employer/profile">Update company profile →</Link>
  ) : null;

  if (status === "PENDING") {
    return (
      <Notice tone="info" title="We're checking your company">
        You can already create vacancies. They go live once your company is verified.
      </Notice>
    );
  }
  if (status === "REJECTED") {
    return (
      <Notice tone="danger" title="Your company details need changes" action={profileLink}>
        {note || "Update your company details and send them again."}
      </Notice>
    );
  }
  if (status === "SUSPENDED") {
    return (
      <Notice
        tone="danger"
        title="This employer account is suspended"
        action={<Link className={styles.linkArrow} href="/contact">Contact Daraja →</Link>}
      >
        {note ? `${note} ` : ""}You can&apos;t create or edit vacancies while the account is suspended.
      </Notice>
    );
  }
  return null;
}
