import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import PublicSiteNav from "@/components/PublicSiteNav";
import LinkedInSharePanel from "@/components/LinkedInSharePanel";
import SurfaceCard from "@/components/ui/SurfaceCard";
import prisma from "@/lib/prisma";
import styles from "./linkedin.module.css";

export const metadata = {
  title: "LinkedIn | Daraja",
  description: "Connect LinkedIn and explicitly publish approved Daraja posts.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const ERRORS = {
  "not-configured": "LinkedIn is not configured on this Daraja environment yet.",
  cancelled: "LinkedIn connection was cancelled.",
  "invalid-state": "The LinkedIn connection request could not be verified. Please try again.",
  "connection-failed": "LinkedIn could not be connected. Please try again.",
};

export default async function LinkedInPage({ searchParams }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/account/linkedin");

  const params = await searchParams;
  const connection = await prisma.linkedInConnection.findUnique({
    where: { userId: session.user.id },
    select: {
      displayName: true,
      expiresAt: true,
      scope: true,
    },
  });

  return (
    <div className={styles.page}>
      <PublicSiteNav />
      <main className={styles.main} id="main-content">
        <Link className={styles.back} href="/account">← Back to account</Link>
        <div className={styles.heading}>
          <span>LinkedIn</span>
          <h1>Connect and share deliberately.</h1>
          <p>
            LinkedIn sign-in and LinkedIn posting are separate permissions. Daraja publishes nothing
            until you write the post and press the publish button yourself.
          </p>
        </div>

        {params?.connected === "1" ? (
          <p className={styles.success}>LinkedIn sharing is connected.</p>
        ) : null}
        {params?.error && ERRORS[params.error] ? (
          <p className={styles.error}>{ERRORS[params.error]}</p>
        ) : null}

        <SurfaceCard>
          <LinkedInSharePanel
            connected={Boolean(connection)}
            displayName={connection?.displayName || null}
            expiresAt={connection?.expiresAt?.toISOString() || null}
          />
        </SurfaceCard>
      </main>
    </div>
  );
}
