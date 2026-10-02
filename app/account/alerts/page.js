import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import AlertPreferencesForm from "@/components/AlertPreferencesForm";
import CandidateAccountTabs from "@/components/CandidateAccountTabs";
import PublicSiteNav from "@/components/PublicSiteNav";
import PageHero from "@/components/ui/PageHero";
import WorkspaceShell from "@/components/ui/WorkspaceShell";
import { candidateCareerEnabled } from "@/lib/candidate-access";
import prisma from "@/lib/prisma";
import styles from "./alerts-account.module.css";

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

  const signOutForm = (
    <form
      className={styles.signOut}
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/jobs" });
      }}
    >
      <button type="submit">Sign out</button>
    </form>
  );

  return (
    <div className={styles.page}>
      <PublicSiteNav right={signOutForm} />

      <main id="main-content">
        <PageHero
          eyebrow="Candidate account"
          title="Alerts built around the work you want."
          description="Select your core job categories, add optional refinements and keep full control over whether Daraja sends you email alerts."
          maxWidth="narrow"
        />

        <WorkspaceShell width="narrow">
          <CandidateAccountTabs showCareer={candidateCareerEnabled()} />

          <section className={styles.accountCard}>
            <div className={styles.accountStatus}>
              <span>Signed in as</span>
              <strong>{session.user.email}</strong>
              <p>
                Alerts are private to this account and can be changed or paused
                whenever you want.
              </p>
            </div>

            <AlertPreferencesForm initialPreferences={subscriber} />
          </section>
        </WorkspaceShell>
      </main>
    </div>
  );
}
