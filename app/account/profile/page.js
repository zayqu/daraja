import { notFound, redirect } from "next/navigation";
import PublicSiteNav from "@/components/PublicSiteNav";
import CandidateAccountTabs from "@/components/CandidateAccountTabs";
import CandidateProfileForm from "@/components/CandidateProfileForm";
import PageHero from "@/components/ui/PageHero";
import SurfaceCard from "@/components/ui/SurfaceCard";
import WorkspaceShell from "@/components/ui/WorkspaceShell";
import {
  candidateCareerEnabled,
  getCandidateUser,
} from "@/lib/candidate-access";
import { candidateProfileSelect } from "@/lib/candidate-profile";
import prisma from "@/lib/prisma";
import styles from "./profile.module.css";

export const metadata = {
  title: "Candidate profile | Daraja",
  description: "Manage your private Daraja candidate profile.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function CandidateProfilePage() {
  if (!candidateCareerEnabled()) notFound();

  const user = await getCandidateUser();
  if (!user) redirect("/auth/signin?callbackUrl=/account/profile");

  const profile = await prisma.jobSeeker.findUnique({
    where: { userId: user.id },
    select: candidateProfileSelect,
  });

  const initialProfile =
    profile ||
    {
      fullName: user.name || "",
      phone: "",
      headline: "",
      location: "",
      experienceLevel: "",
      workArrangement: "",
      portfolioUrl: "",
    };

  return (
    <div className={styles.page}>
      <PublicSiteNav />
      <main id="main-content">
        <PageHero
          eyebrow="Candidate account"
          title="Build the profile Daraja can use for your career tools."
          description="Keep your core candidate information accurate in one private profile. Nothing here is made public by default."
          maxWidth="narrow"
        />

        <WorkspaceShell width="narrow">
          <CandidateAccountTabs showCareer />

          <SurfaceCard>
            <div className={styles.heading}>
              <span>Private candidate profile</span>
              <h2>Your details</h2>
              <p>
                Daraja uses this information only inside authorised candidate,
                application and future career workflows.
              </p>
            </div>

            <CandidateProfileForm initialProfile={initialProfile} />
          </SurfaceCard>
        </WorkspaceShell>
      </main>
    </div>
  );
}
