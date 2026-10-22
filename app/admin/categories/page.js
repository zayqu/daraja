import { PageHeader, Panel } from "@/components/admin/AdminUi";
import { CategoryCreateForm, CategoryMoveForm, CategoryRow } from "@/components/admin/CategoryControls";
import styles from "@/components/admin/admin.module.css";
import { requireAdminPage } from "@/lib/admin-guard";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  await requireAdminPage("/admin/categories");
  const [categories, all, live] = await Promise.all([
    prisma.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    prisma.job.groupBy({ by: ["category"], _count: { _all: true } }),
    prisma.job.groupBy({ by: ["category"], where: { moderationStatus: "PUBLISHED", active: true }, _count: { _all: true } }),
  ]);
  const total = Object.fromEntries(all.map((entry) => [entry.category, entry._count._all]));
  const liveCount = Object.fromEntries(live.map((entry) => [entry.category, entry._count._all]));
  const names = categories.map((category) => category.name);
  // Jobs can still carry a category name that no longer exists.
  const orphaned = Object.keys(total).filter((name) => !names.includes(name));

  return (
    <>
      <PageHeader
        title="Categories"
        description="The job categories visitors browse and filter by. Daraja sorts new jobs into them using each category's keywords."
      />

      <Panel title="Add a category">
        <CategoryCreateForm />
      </Panel>

      <Panel title={`${categories.length} categories`} flush>
        <ul className={styles.categoryList}>
          {categories.map((category, index) => (
            <CategoryRow
              key={category.id}
              first={index === 0}
              last={index === categories.length - 1}
              others={names.filter((name) => name !== category.name)}
              category={{
                id: category.id,
                name: category.name,
                keywords: category.keywords,
                active: category.active,
                isFallback: category.isFallback,
                live: liveCount[category.name] || 0,
                total: total[category.name] || 0,
              }}
            />
          ))}
        </ul>
      </Panel>

      <Panel title="Move jobs between categories">
        {orphaned.length ? (
          <p className={styles.alert}>
            {orphaned.length} old category name{orphaned.length === 1 ? " is" : "s are"} still used by some jobs:{" "}
            {orphaned.join(", ")}. Move those jobs into a current category.
          </p>
        ) : null}
        <CategoryMoveForm fromOptions={[...names, ...orphaned]} toOptions={names} />
        <p className={styles.help}>Moved jobs are marked as edited by an admin, so the hourly scrape will not move them back.</p>
      </Panel>
    </>
  );
}
