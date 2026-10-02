import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import CandidateAccountTabs from "@/components/CandidateAccountTabs";
import PublicSiteNav from "@/components/PublicSiteNav";
import PageHero from "@/components/ui/PageHero";
import SurfaceCard from "@/components/ui/SurfaceCard";
import WorkspaceShell from "@/components/ui/WorkspaceShell";
import { candidateCareerEnabled } from "@/lib/candidate-access";
import prisma from "@/lib/prisma";
import styles from "./notifications.module.css";

export const metadata = {
  title: "Notifications | Daraja",
  description: "View your Daraja account notifications.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=/account/notifications");
  }

  const [profile, alerts] = await Promise.all([
    prisma.jobSeeker.findUnique({
      where: { userId: session.user.id },
      select: { id: true, fullName: true, headline: true, location: true },
    }),
    prisma.jobAlertSubscriber.findUnique({
      where: { userId: session.user.id },
      select: { active: true },
    }),
  ]);

  const profileComplete = Boolean(
    profile?.fullName && profile?.headline && profile?.location,
  );

  return (
    <div className={styles.page}>
      <PublicSiteNav />
      <main id="main-content">
        <PageHero
          eyebrow="Candidate account"
          title="Notifications"
          description="This is your Daraja notification centre. We will use it for real account and career updates as those workflows are enabled."
          maxWidth="narrow"
        />

        <WorkspaceShell width="narrow">
          <CandidateAccountTabs showCareer={candidateCareerEnabled()} />

          <div className={styles.stack}>
            <SurfaceCard>
              <div className={styles.emptyState}>
                <div className={styles.bell} aria-hidden="true">○</div>
                <div>
                  <span>In-app notifications</span>
                  <h2>You are all caught up.</h2>
                  <p>
                    There are no persisted in-app notifications yet. The bell is
                    ready in the navigation, but Daraja will not show fake unread
                    counts before the notification backend exists.
                  </p>
                </div>
              </div>
            </SurfaceCard>

            <SurfaceCard>
              <div className={styles.sectionHeading}>
                <span>Account readiness</span>
                <h2>Current settings</h2>
              </div>

              <div className={styles.statusGrid}>
                <div>
                  <span>Candidate profile</span>
                  <strong>{profileComplete ? "Ready" : "Needs details"}</strong>
                  <Link href="/account/profile">
                    {profileComplete ? "Review profile" : "Complete profile"} →
                  </Link>
                </div>
                <div>
                  <span>Email job alerts</span>
                  <strong>{alerts?.active ? "Active" : "Paused or not set"}</strong>
                  <Link href="/account/alerts">Manage job alerts →</Link>
                </div>
              </div>
            </SurfaceCard>
          </div>
        </WorkspaceShell>
      </main>
    </div>
  );
}
