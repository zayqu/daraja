import { PageHeader, Panel } from "@/components/admin/AdminUi";
import DistributionCampaignManager from "@/components/admin/DistributionCampaignManager";
import { requireAdminPage } from "@/lib/admin-guard";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "Distribution campaigns | DARAJA Admin", robots: { index: false, follow: false } };

export default async function AdminDistributionCampaigns() {
  await requireAdminPage("/admin/distribution-campaigns");
  const [employers, jobs, campaigns] = await Promise.all([
    prisma.employer.findMany({
      where: { verificationStatus: "VERIFIED" },
      select: { id: true, companyName: true },
      orderBy: { companyName: "asc" }, take: 100,
    }),
    prisma.job.findMany({
      where: { employerId: { not: null }, moderationStatus: "PUBLISHED", active: true,
        OR: [{ deadline: null }, { deadline: { gte: new Date() } }] },
      select: { id: true, employerId: true, title: true, applicationUrl: true },
      orderBy: { updatedAt: "desc" }, take: 150,
    }),
    prisma.distributionCampaign.findMany({
      include: { employer: { select: { companyName: true } },
        job: { select: { title: true, slug: true } } },
      orderBy: { createdAt: "desc" }, take: 50,
    }),
  ]);
  return (
    <>
      <PageHeader title="Recruitment distribution"
        description="Partner-owned campaigns and independently labelled campaign measurements. DARAJA does not recruit or receive candidate CVs."/>
      <Panel title="Campaign register">
        <DistributionCampaignManager employers={employers}
          jobs={jobs.filter((job) => job.applicationUrl?.startsWith("https://"))}
          campaigns={campaigns.map((campaign) => ({
            ...campaign,
            createdAt: campaign.createdAt.toISOString(),
            updatedAt: campaign.updatedAt.toISOString(),
            publishedAt: campaign.publishedAt?.toISOString() || null,
            approvedByPartnerAt: campaign.approvedByPartnerAt.toISOString(),
            viewsRecordedAt: campaign.viewsRecordedAt?.toISOString() || null,
            outcomesRecordedAt: campaign.outcomesRecordedAt?.toISOString() || null,
            analyticsRecordedAt: campaign.analyticsRecordedAt?.toISOString() || null,
          }))}/>
      </Panel>
    </>
  );
}
