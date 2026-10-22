import Link from "next/link";
import CategoryMoveForm from "@/components/admin/CategoryMoveForm";
import { Badge, PageHeader, Panel } from "@/components/admin/AdminUi";
import styles from "@/components/admin/admin.module.css";
import { requireAdminPage } from "@/lib/admin-guard";
import { JOB_CATEGORIES } from "@/lib/job-categories";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  await requireAdminPage("/admin/categories");
  const [all, live] = await Promise.all([
    prisma.job.groupBy({ by: ["category"], _count: { _all: true } }),
    prisma.job.groupBy({ by: ["category"], where: { moderationStatus: "PUBLISHED", active: true }, _count: { _all: true } }),
  ]);
  const total = Object.fromEntries(all.map((entry) => [entry.category, entry._count._all]));
  const liveCount = Object.fromEntries(live.map((entry) => [entry.category, entry._count._all]));
  // Older jobs can carry category names that are no longer in the list.
  const outdated = Object.keys(total).filter((category) => !JOB_CATEGORIES.includes(category));
  const rows = [...JOB_CATEGORIES, ...outdated];

  return (
    <>
      <PageHeader
        title="Categories"
        description="The job categories visitors filter by. Daraja sorts new jobs into them automatically; you can correct jobs here or one by one."
      />
      <Panel title="Move jobs between categories">
        <CategoryMoveForm fromOptions={rows} toOptions={JOB_CATEGORIES} />
        <p className={styles.help}>
          Moved jobs are marked as edited by an admin, so the hourly scrape will not move them back.
        </p>
      </Panel>
      <Panel title={`${JOB_CATEGORIES.length} categories`} flush>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Category</th>
                <th>Live jobs</th>
                <th>All jobs</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {rows.map((category) => (
                <tr key={category}>
                  <td>
                    <span className={styles.primaryCell}>{category}</span>
                    {outdated.includes(category) ? <> <Badge tone="amber">Not in the category list</Badge></> : null}
                  </td>
                  <td>{liveCount[category] || 0}</td>
                  <td>{total[category] || 0}</td>
                  <td>
                    <div className={styles.rowActions}>
                      <Link className={styles.button} href={`/admin/jobs?category=${encodeURIComponent(category)}`}>View jobs</Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <Panel>
        <p className={styles.help} style={{ marginTop: 0 }}>
          Adding or renaming a category changes the public filters, the automatic sorting and the SEO pages for each
          sector, so it is done as a development change rather than here.
        </p>
      </Panel>
    </>
  );
}
