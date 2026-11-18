import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import CandidateProfileForm from "@/components/CandidateProfileForm";
import { PageHeader } from "@/components/dashboard/DashboardUi";
import dash from "@/components/dashboard/dashboard.module.css";
import SurfaceCard from "@/components/ui/SurfaceCard";
import {
  candidateCareerEnabled,
  getCandidateUser,
} from "@/lib/candidate-access";
import { candidateProfileSelect } from "@/lib/candidate-profile";
import prisma from "@/lib/prisma";
import styles from "../profile.module.css";

export const metadata = {
  title: "Edit profile",
  description: "Edit your private Daraja candidate profile.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function EditCandidateProfilePage() {
  if (!candidateCareerEnabled()) notFound();

  const user = await getCandidateUser();
  if (!user) redirect("/auth/signin?callbackUrl=/account/profile/edit");

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
        title="Edit profile"
        description="Your private candidate details. Nothing here is public by default."
        actions={<Link className={dash.button} href="/account/profile">Back to profile</Link>}
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

    </>
  );
}
