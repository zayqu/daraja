import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import {
  candidateCareerEnabled,
  getCandidateUser,
} from "@/lib/candidate-access";
import PublicSiteNav from "@/components/PublicSiteNav";
import CandidateAccountTabs from "@/components/CandidateAccountTabs";
import PageHero from "@/components/ui/PageHero";
import WorkspaceShell from "@/components/ui/WorkspaceShell";
import CvBuilder from "@/components/CvBuilder";

export const metadata = {
  title: "Smart CV Builder | Daraja",
  description:
    "Build Tanzania-first, ATS-ready CV versions for private-sector and public-service applications.",
};

export const dynamic = "force-dynamic";

export default async function CvBuilderPage() {
  if (!candidateCareerEnabled()) notFound();

  const user = await getCandidateUser();
  if (!user) redirect("/auth/signin?callbackUrl=/account/career/cv");

  return (
    <>
      <PublicSiteNav />
      <main id="main-content">
        <PageHero
          eyebrow="Candidate workspace"
          title="Build a CV for the job you want."
          description="Create a Master CV, tailor role-specific versions, check ATS readiness and export a clean PDF without giving up your own facts or design preferences."
        />

        <WorkspaceShell width="wide">
          <CandidateAccountTabs showCareer />
          <Suspense fallback={<p>Loading CV Builder…</p>}>
            <CvBuilder />
          </Suspense>
        </WorkspaceShell>
      </main>
    </>
  );
}
