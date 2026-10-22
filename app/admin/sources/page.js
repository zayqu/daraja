import Link from "next/link";
import { Badge, PageHeader, Panel, formatDate } from "@/components/admin/AdminUi";
import { SourceActions, SourceForm, SourceSwitch } from "@/components/admin/SourceControls";
import styles from "@/components/admin/admin.module.css";
import { requireAdminPage } from "@/lib/admin-guard";
import prisma from "@/lib/prisma";
import sourceSettings from "@/scraper/lib/source-settings";

const { applySourceSettings, getSourceCatalog } = sourceSettings;

export const dynamic = "force-dynamic";

// Plain data for the client controls (no functions, no Dates).
function clientSource(source) {
  return {
    id: source.id,
    name: source.name,
    url: source.url,
    configurable: source.adapter === "verified-agency",
    recruiterName: source.recruiterName || "",
    countryFilter: source.countryFilter || "",
    discovery: source.discovery || {},
    detail: source.detail || {},
  };
}

export default async function AdminSourcesPage() {
  await requireAdminPage("/admin/sources");
  const [settings, counts, latest] = await Promise.all([
    prisma.scraperSourceSetting.findMany(),
    prisma.job.groupBy({ by: ["source"], where: { moderationStatus: "PUBLISHED", active: true }, _count: { _all: true } }),
    prisma.job.groupBy({ by: ["source"], _max: { updatedAt: true } }),
  ]);
  const liveBySource = Object.fromEntries(counts.map((entry) => [entry.source, entry._count._all]));
  const lastSeen = Object.fromEntries(latest.map((entry) => [entry.source, entry._max.updatedAt]));
  const catalog = applySourceSettings(getSourceCatalog(), settings);
  const runnable = catalog
    .filter((source) => source.adapter)
    .sort((a, b) => Number(Boolean(b.enabled)) - Number(Boolean(a.enabled)) || a.name.localeCompare(b.name));
  const planned = catalog.filter((source) => !source.adapter);

  return (
    <>
      <PageHeader
        title="Job sources"
        description="Websites Daraja collects vacancies from every hour. Changes apply on the next run."
      />

      <Panel title="Add a job website">
        <p className={styles.help} style={{ marginTop: 0 }}>
          Works for recruiter and company careers pages that list job ads with their own pages. New sources start
          switched off and held for review: test them, then switch them on.
        </p>
        <details className={styles.disclosure}>
          <summary className={styles.buttonPrimary}>Add source</summary>
          <div className={styles.inlineForm}>
            <SourceForm />
          </div>
        </details>
      </Panel>

      <Panel title={`Sources (${runnable.length})`} flush>
        <div className={styles.tableWrap}>
          <table className={`${styles.table} ${styles.stackOnMobile}`}>
            <thead>
              <tr>
                <th>Source</th>
                <th>Live jobs</th>
                <th>Last update</th>
                <th>Collect</th>
                <th>Publish automatically</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {runnable.map((source) => (
                <tr key={source.id}>
                  <td data-label="Source">
                    <Link className={styles.primaryCell} href={`/admin/jobs?source=${encodeURIComponent(source.id)}`}>
                      {source.name}
                    </Link>
                    <span className={styles.subtle}>
                      <a href={source.url} target="_blank" rel="noreferrer nofollow">{source.url}</a>
                    </span>
                    {source.addedByAdmin ? <Badge tone="blue">Added by admin</Badge> : null}
                  </td>
                  <td data-label="Live jobs">{liveBySource[source.id] || 0}</td>
                  <td data-label="Last update">{formatDate(lastSeen[source.id])}</td>
                  <td data-label="Collect">
                    <SourceSwitch
                      id={source.id}
                      name={source.name}
                      field="enabled"
                      value={Boolean(source.enabled)}
                      confirmOff={`Stop collecting jobs from ${source.name}? Jobs already on Daraja stay until they close.`}
                    />
                  </td>
                  <td data-label="Publish automatically">
                    <SourceSwitch
                      id={source.id}
                      name={source.name}
                      field="autoPublish"
                      value={source.publishPolicy?.autoPublish === true}
                    />
                  </td>
                  <td>
                    <SourceActions source={clientSource(source)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title={`Planned websites (${planned.length})`}>
        <p className={styles.help} style={{ marginTop: 0 }}>
          These are in Daraja&apos;s list of websites to cover but have no reader yet. Recruiter and careers sites can
          usually be added above with &quot;Add source&quot;; sites with a completely different layout need a
          development change.
        </p>
      </Panel>
    </>
  );
}
