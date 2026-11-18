import { notFound, redirect } from "next/navigation";
import CandidateProfileForm from "@/components/CandidateProfileForm";
import AccountMenu from "@/components/dashboard/AccountMenu";
import { PageHeader } from "@/components/dashboard/DashboardUi";
import SurfaceCard from "@/components/ui/SurfaceCard";
import {
  candidateCareerEnabled,
  getCandidateUser,
} from "@/lib/candidate-access";
import { candidateProfileSelect } from "@/lib/candidate-profile";
import prisma from "@/lib/prisma";
import styles from "./profile.module.css";

export const metadata = {
  title: "Candidate profile",
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
    <>
      <PageHeader
        title="My profile"
        description="Your private candidate details. Nothing here is public by default."
      />

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

      <AccountMenu role={user.role} />
    </>
  );
}
