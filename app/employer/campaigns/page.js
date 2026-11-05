import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { employerPortalEnabled, getActor } from "@/lib/employer-access";
import prisma from "@/lib/prisma";
import SiteNav from "@/components/SiteNav";
import PageHero from "@/components/ui/PageHero";
import WorkspaceShell from "@/components/ui/WorkspaceShell";
import SurfaceCard from "@/components/ui/SurfaceCard";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Distribution campaign reports | DARAJA",
  robots: { index: false, follow: false },
};
const metric = (value) => value === null ? "Unavailable" : value.toLocaleString("en-GB");

export default async function EmployerDistributionReports() {
  if (!employerPortalEnabled()) notFound();
  const actor = await getActor();
  if (!actor) redirect("/auth/signin?callbackUrl=/employer/campaigns");
  if (!actor.employer) redirect("/employer");
  const campaigns = await prisma.distributionCampaign.findMany({
    where: { employerId: actor.employer.id },
    orderBy: { createdAt: "desc" },
    include: { job: { select: { title: true, slug: true, applicationUrl: true } } },
    take: 50,
  });
  return (
    <>
      <SiteNav/>
      <main id="main-content">
        <PageHero eyebrow="Private employer reporting" title="Distribution performance"
          description="Your vacancies remain yours. DARAJA distributes approved posts and reports what can be verified."/>
        <WorkspaceShell>
          <p><Link href="/employer">Back to employer workspace</Link></p>
          {campaigns.length ? campaigns.map((c) => (
            <SurfaceCard key={c.id} as="article">
              <p><strong>{c.job.title}</strong> · {c.status.toLowerCase()}</p>
              <p>Campaign ID: {c.campaignKey}</p>
              <p><Link href={`/jobs/${c.job.slug}`}>View vacancy on Ajira</Link> · <a href={c.job.applicationUrl} target="_blank" rel="noopener noreferrer">Partner application destination</a></p>
              <p>WhatsApp Channel views (24 hours): <strong>{metric(c.views24h)}</strong></p>
              <p>WhatsApp Channel views (7 days): <strong>{metric(c.views7d)}</strong></p>
              <p>Attributed sessions: <strong>{metric(c.ga4Sessions)}</strong></p>
              <p>Apply-button clicks: <strong>{metric(c.ga4ApplyClicks)}</strong></p>
              <p>Completed applications: <strong>{metric(c.reportedApplications)}</strong> (partner-reported)</p>
              <p>Interviews: <strong>{metric(c.reportedInterviews)}</strong> (partner-reported)</p>
              <p>Hires: <strong>{metric(c.reportedHires)}</strong> (partner-reported)</p>
              <p><small>Channel views verified: {c.viewsRecordedAt?.toLocaleString("en-GB",{timeZone:"Africa/Dar_es_Salaam"}) || "Not yet"}.
                Partner outcomes updated: {c.outcomesRecordedAt?.toLocaleString("en-GB",{timeZone:"Africa/Dar_es_Salaam"}) || "Not yet"}.
                GA4 metrics require a verified integration. No figures represent guaranteed applications.</small></p>
              <p><Link href={`/employer/campaigns/${c.id}/report`}>Open printable seven-day report</Link></p>
            </SurfaceCard>
          )) : <SurfaceCard>
            <p>No approved distribution campaigns yet. A campaign appears here after DARAJA and your organisation agree to one specific vacancy.</p>
          </SurfaceCard>}
        </WorkspaceShell>
      </main>
    </>
  );
}
