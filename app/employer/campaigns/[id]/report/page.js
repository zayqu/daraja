import { redirect, notFound } from "next/navigation";
import { employerPortalEnabled, getActor } from "@/lib/employer-access";
import prisma from "@/lib/prisma";
import PrintCampaignReport from "@/components/PrintCampaignReport";

export const dynamic = "force-dynamic";
export const metadata = { title: "Campaign performance report | DARAJA", robots: { index: false, follow: false } };
const display = (n) => n === null ? "Unavailable" : n.toLocaleString("en-GB");

export default async function DistributionReport({ params }) {
  if (!employerPortalEnabled()) notFound();
  const actor = await getActor();
  if (!actor) redirect("/auth/signin?callbackUrl=/employer/campaigns");
  if (!actor.employer || actor.employer.verificationStatus !== "VERIFIED") notFound();
  const { id } = await params;
  const c = await prisma.distributionCampaign.findFirst({
    where: { id, employerId: actor.employer.id },
    include: { employer: { select: { companyName: true } },
      job: { select: { title: true } } },
  });
  if (!c) notFound();
  return (
    <main id="main-content" style={{maxWidth:820,margin:"30px auto",padding:24}}>
      <h1>DARAJA — Recruitment distribution report</h1>
      <p><strong>{c.employer.companyName}</strong> | {c.vacancyTitle}</p>
      <p>Campaign: {c.campaignKey} | Status: {c.status} | Destination: {c.destinationMode === "PARTNER_DIRECT" ? "Partner website / ATS" : "Ajira job page"}</p>
      <p>Published: {c.publishedAt?.toLocaleString("en-GB",{timeZone:"Africa/Dar_es_Salaam"}) || "Not yet published"}</p>
      <table style={{width:"100%",borderCollapse:"collapse"}}>
        <tbody>
          {[
            ["Outbound partner redirects (not unique applicants)", c.status === "DRAFT" ? "Unavailable" : display(c.outboundRedirects)],
            ["WhatsApp post views at 24 hours", display(c.views24h)],
            ["WhatsApp post views at seven days", display(c.views7d)],
            ["Attributed website sessions", display(c.ga4Sessions)],
            ["Apply-button clicks", display(c.ga4ApplyClicks)],
            ["Completed applications (partner-reported)", display(c.reportedApplications)],
            ["Interviews (partner-reported)", display(c.reportedInterviews)],
            ["Hires (partner-reported)", display(c.reportedHires)],
          ].map(([name,value]) => <tr key={name}><th style={{textAlign:"left",padding:10,borderBottom:"1px solid #ddd"}}>{name}</th>
            <td style={{padding:10,borderBottom:"1px solid #ddd"}}>{value}</td></tr>)}
        </tbody>
      </table>
      <p>Channel view figures are entered from WhatsApp insights by DARAJA. Partner outcomes are supplied by the partner. Website analytics are displayed only when independently verified; unavailable figures are not zero. Redirect requests and Apply clicks are not completed applications.</p>
      <p>Updated: {c.updatedAt.toLocaleString("en-GB",{timeZone:"Africa/Dar_es_Salaam"})} EAT.</p>
      <p>DARAJA is a vacancy distribution and reporting service, not a recruitment agent. The partner retains candidate relationships, applications and hiring decisions.</p>
      <PrintCampaignReport />
    </main>
  );
}
