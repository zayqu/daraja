import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import {
  candidateCareerEnabled,
  getCandidateUser,
} from "@/lib/candidate-access";
import CvBuilder from "@/components/CvBuilder";

export const metadata = {
  title: "Smart CV Builder",
  description:
    "Build Tanzania-first, ATS-ready CV versions for private-sector and public-service applications.",
};

export const dynamic = "force-dynamic";

export default async function CvBuilderPage() {
  if (!candidateCareerEnabled()) notFound();

  const user = await getCandidateUser();
  if (!user) redirect("/auth/signin?callbackUrl=/account/career/cv");

  return (
    <Suspense fallback={<p>Loading CV Builder…</p>}>
      <CvBuilder />
    </Suspense>
  );
}
