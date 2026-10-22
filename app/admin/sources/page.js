import Link from "next/link";
import { Badge, PageHeader, Panel, formatDate } from "@/components/admin/AdminUi";
import SourceToggle from "@/components/admin/SourceToggle";
import styles from "@/components/admin/admin.module.css";
import { requireAdminPage } from "@/lib/admin-guard";
import prisma from "@/lib/prisma";
import sourceSettings from "@/scraper/lib/source-settings";

const { applySourceSettings, getSourceCatalog } = sourceSettings;

export const dynamic = "force-dynamic";

export default async function AdminSourcesPage() {
  await requireAdminPage("/admin/sources");
  const [settings, counts, latest] = await Promise.all([
    prisma.scraperSourceSetting.findMany({ select: { sourceId: true, enabled: true, updatedAt: true } }),
    prisma.job.groupBy({ by: ["source"], where: { moderationStatus: "PUBLISHED", active: true }, _count: { _all: true } }),
    prisma.job.groupBy({ by: ["source"], _max: { updatedAt: true } }),
  ]);
  const liveBySource = Object.fromEntries(counts.map((entry) => [entry.source, entry._count._all]));
  const lastSeen = Object.fromEntries(latest.map((entry) => [entry.source, entry._max.updatedAt]));
  const catalog = applySourceSettings(getSourceCatalog(), settings);
  const runnable = catalog.filter((source) => source.adapter);
  const planned = catalog.filter((source) => !source.adapter);

  return (
    <>
      <PageHeader
        title="Job sources"
        description="Websites Daraja collects vacancies from every hour. Switching a source off takes effect on the next run."
      />
      <Panel title={`Active scrapers (${runnable.length})`} flush>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Source</th>
                <th>Live jobs</th>
                <th>Last update</th>
                <th>Publishing</th>
                <th>On</th>
              </tr>
            </thead>
            <tbody>
              {runnable.map((source) => (
                <tr key={source.id}>
                  <td>
                    <Link className={styles.primaryCell} href={`/admin/jobs?source=${encodeURIComponent(source.id)}`}>{source.name}</Link>
                    <span className={styles.subtle}>
                      <a href={source.url} target="_blank" rel="noreferrer nofollow">{source.url}</a>
                      {source.adminOverride ? " · set by admin" : ""}
                    </span>
                  </td>
                  <td>{liveBySource[source.id] || 0}</td>
                  <td>{formatDate(lastSeen[source.id])}</td>
                  <td>
                    {source.publishPolicy?.autoPublish ? <Badge tone="green">Automatic</Badge> : <Badge tone="amber">Needs review</Badge>}
                  </td>
                  <td><SourceToggle id={source.id} name={source.name} enabled={Boolean(source.enabled)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <Panel title={`Planned sources (${planned.length})`}>
        <p className={styles.help} style={{ marginTop: 0 }}>
          These websites are in Daraja&apos;s source list but do not have a tested scraper yet, so they cannot be
          switched on here. Adding one is a development task.
        </p>
      </Panel>
    </>
  );
}
