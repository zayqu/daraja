import { redirect } from "next/navigation";
import { auth } from "@/auth";
import AlertPreferencesForm from "@/components/AlertPreferencesForm";
import { PageHeader } from "@/components/dashboard/DashboardUi";
import prisma from "@/lib/prisma";
import styles from "./alerts-account.module.css";
import { getCategoryNames } from "@/lib/public-jobs";

export const metadata = {
  title: "My job alerts",
  description: "Manage personalised Daraja job alert preferences.",
  robots: { index: false, follow: false },
};

export default async function AlertAccountPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=/account/alerts");
  }

  const subscriber = await prisma.jobAlertSubscriber.findUnique({
    where: { userId: session.user.id },
    select: {
      categories: true,
      locations: true,
      experienceLevels: true,
      workArrangements: true,
      organisations: true,
      keywords: true,
      active: true,
    },
  });

  return (
    <>
      <PageHeader
        title="Job alerts"
        description="Choose your job categories, add optional refinements and decide whether Daraja emails you."
      />

      <section className={styles.accountCard}>
        <div className={styles.accountStatus}>
          <span>Signed in as</span>
          <strong>{session.user.email}</strong>
          <p>
            Alerts are private to this account and can be changed or paused
            whenever you want.
          </p>
        </div>

        <AlertPreferencesForm initialPreferences={subscriber} categoryOptions={await getCategoryNames()} />
      </section>
    </>
  );
}
