import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import AlertPreferencesForm from "@/components/AlertPreferencesForm";
import PublicSiteNav from "@/components/PublicSiteNav";
import prisma from "@/lib/prisma";

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
      className="alerts-signout"
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/jobs" });
      }}
    >
      <button type="submit">Sign out</button>
    </form>
  );

  return (
    <main id="main-content" className="account-page">
      <PublicSiteNav links={[{ href: "/jobs", label: "Browse Jobs" }]} right={signOutForm} />
      <section className="account-shell">
        <p className="eyebrow">Candidate account</p>
        <h1>My job alerts</h1>
        <p className="intro">
          Signed in as <strong>{session.user.email}</strong>. Choose the
          opportunities most relevant to you; every selection can be changed later.
        </p>
        <AlertPreferencesForm initialPreferences={subscriber} />
      </section>
      <style>{`
        .account-page { min-height: 80vh; padding-bottom: 4rem; background: #f7f8fa; color: #1b2a3f; }
        .alerts-signout button { min-height: 40px; padding: .55rem .9rem; border: 1px solid rgba(255,255,255,.4); border-radius: 6px; background: transparent; color: white; font: inherit; cursor: pointer; }
        .alerts-signout button:hover { border-color: #00c9a7; color: #00c9a7; }
        .account-shell { max-width: 760px; margin: 2.5rem auto 0; padding: 2rem; background: #fff; border: 1px solid #e4e7ec; border-radius: 12px; }
        .eyebrow { margin: 0; color: #087f6c; font-size: .72rem; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
        h1 { margin: .4rem 0; }
        .intro { color: #667085; line-height: 1.65; }
        @media (max-width: 640px) { .account-shell { margin: 1.25rem; padding: 1.25rem; } }
      `}</style>
    </main>
  );
}
