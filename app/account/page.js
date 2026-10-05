import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import PublicSiteNav from "@/components/PublicSiteNav";
import NavIcon from "@/components/ui/NavIcon";
import { candidateCareerEnabled } from "@/lib/candidate-access";
import { candidateProfileSelect } from "@/lib/candidate-profile";
import prisma from "@/lib/prisma";
import styles from "./account.module.css";

export const metadata = {
  title: "My account | Daraja",
  description: "Manage your Daraja candidate account and career tools.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function initials(name, email) {
  const source = String(name || email || "D").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length > 1) {
    return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

function profileProgress(profile) {
  if (!profile) return { complete: 0, total: 6 };
  const fields = [
    profile.fullName,
    profile.phone,
    profile.headline,
    profile.location,
    profile.experienceLevel,
    profile.workArrangement,
  ];
  return {
    complete: fields.filter(Boolean).length,
    total: fields.length,
  };
}

function AccountLink({ href, icon, title, description, meta }) {
  return (
    <Link className={styles.item} href={href}>
      <span className={styles.itemIcon} aria-hidden="true">
        <NavIcon name={icon} size={20} />
      </span>
      <span className={styles.itemBody}>
        <strong>{title}</strong>
        <span>{description}</span>
      </span>
      {meta ? <span className={styles.itemMeta}>{meta}</span> : null}
      <span className={styles.chevron} aria-hidden="true">›</span>
    </Link>
  );
}

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=/account");
  }

  const careerEnabled = candidateCareerEnabled();

  const [profile, cvCount, alert] = await Promise.all([
    careerEnabled
      ? prisma.jobSeeker.findUnique({
          where: { userId: session.user.id },
          select: candidateProfileSelect,
        })
      : Promise.resolve(null),
    careerEnabled
      ? prisma.candidateCv.count({
          where: { jobSeeker: { userId: session.user.id } },
        })
      : Promise.resolve(0),
    prisma.jobAlertSubscriber.findUnique({
      where: { userId: session.user.id },
      select: { active: true },
    }),
  ]);

  const progress = profileProgress(profile);
  const displayName = profile?.fullName || session.user.name || "Daraja user";
  const profileReady = progress.complete === progress.total;

  const signOutForm = (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/" });
      }}
    >
      <button className={styles.navSignOut} type="submit">Sign out</button>
    </form>
  );

  return (
    <div className={styles.page}>
      <PublicSiteNav right={signOutForm} />

      <main className={styles.main} id="main-content">
        <section className={styles.accountCard} aria-labelledby="account-title">
          <header className={styles.profileHeader}>
            <div className={styles.avatar} aria-hidden="true">
              {initials(displayName, session.user.email)}
            </div>
            <div className={styles.identity}>
              <span>My account</span>
              <h1 id="account-title">{displayName}</h1>
              <p>{session.user.email}</p>
              {profile?.headline || profile?.location ? (
                <small>
                  {[profile?.headline, profile?.location].filter(Boolean).join(" · ")}
                </small>
              ) : null}
            </div>
          </header>

          {careerEnabled ? (
            <div className={styles.profileStatus}>
              <div>
                <span>Profile</span>
                <strong>{profileReady ? "Ready" : `${progress.complete}/${progress.total} complete`}</strong>
              </div>
              <Link href="/account/profile">
                {profileReady ? "Review" : "Complete profile"}
              </Link>
            </div>
          ) : null}

          <nav className={styles.menu} aria-label="Account">
            {careerEnabled ? (
              <>
                <AccountLink
                  href="/account/profile"
                  icon="user"
                  title="Personal information"
                  description="Name, contact details and career preferences"
                />
                <AccountLink
                  href="/account/career/cv"
                  icon="document"
                  title="CV Builder"
                  description="Build, tailor and download your CV"
                  meta={cvCount ? `${cvCount} CV${cvCount === 1 ? "" : "s"}` : undefined}
                />
                <AccountLink
                  href="/account/career"
                  icon="career"
                  title="Career workspace"
                  description="Your Daraja career tools in one place"
                />
              </>
            ) : null}

            <AccountLink
              href="/account/alerts"
              icon="alert"
              title="Job alerts"
              description="Choose the jobs Daraja should send you"
              meta={alert?.active ? "Active" : undefined}
            />
            <AccountLink
              href="/account/notifications"
              icon="bell"
              title="Notifications"
              description="Account and career updates"
            />
            <AccountLink
              href="/account/privacy"
              icon="privacy"
              title="Privacy & data"
              description="Export your data or manage your account"
            />
          </nav>

          <form
            className={styles.signOutRow}
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button type="submit">
              <span className={styles.itemIcon} aria-hidden="true">
                <NavIcon name="logout" size={20} />
              </span>
              <span>
                <strong>Sign out</strong>
                <small>Sign out of this device</small>
              </span>
            </button>
          </form>
        </section>

        <p className={styles.support}>
          Need help? <Link href="/contact">Contact Daraja</Link>
        </p>
      </main>
    </div>
  );
}
