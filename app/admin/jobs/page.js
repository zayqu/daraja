import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import AdminTabs from "@/components/AdminTabs";
import SiteNav from "@/components/SiteNav";
import PageHero from "@/components/ui/PageHero";
import WorkspaceShell from "@/components/ui/WorkspaceShell";
import { getActor, isAdmin } from "@/lib/employer-access";
import prisma from "@/lib/prisma";
import portal from "../../portal.module.css";
import styles from "./admin-jobs.module.css";

export const metadata = { title: "Vacancies | Daraja admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

function formatDate(value) {
  if (!value) return "No deadline";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Dar_es_Salaam",
  });
}

export default async function AdminJobsPage({ searchParams }) {
  const actor = await getActor();
  if (!actor) redirect("/auth/signin?callbackUrl=/admin/jobs");
  if (!isAdmin(actor)) notFound();

  const params = await searchParams;
  const q = typeof params?.q === "string" ? params.q.trim().slice(0, 100) : "";
  const where = q
    ? {
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { company: { contains: q, mode: "insensitive" } },
        ],
      }
    : {};
  const jobs = await prisma.job.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: 60,
    select: {
      id: true,
      slug: true,
      title: true,
      company: true,
      location: true,
      source: true,
      deadline: true,
      active: true,
      moderationStatus: true,
    },
  });

  return (
    <div className={portal.page}>
      <SiteNav />
      <main id="main-content">
        <PageHero
          eyebrow="Administration"
          title="Post and edit vacancies."
          description="Every vacancy on Daraja, including the ones collected automatically. Edits you make are kept: the scrapers will not overwrite them."
        />
        <WorkspaceShell>
          <AdminTabs />
          <div className={styles.toolbar}>
            <form action="/admin/jobs">
              <input name="q" defaultValue={q} placeholder="Search by job title or employer" aria-label="Search vacancies" />
              <button type="submit">Search</button>
            </form>
            <Link className={styles.primary} href="/admin/jobs/new">+ Post a vacancy</Link>
          </div>
          {jobs.length === 0 ? (
            <p className={styles.empty}>No vacancies match “{q}”.</p>
          ) : (
            <ul className={styles.list}>
              {jobs.map((job) => {
                const live = job.active && job.moderationStatus === "PUBLISHED";
                return (
                  <li key={job.id} className={styles.item}>
                    <div>
                      <h3>
                        {job.title}
                        <span className={`${styles.badge} ${live ? styles.live : ""}`}>
                          {live ? "Live" : "Hidden"}
                        </span>
                      </h3>
                      <p>
                        {job.company} · {job.location} · Deadline {formatDate(job.deadline)} · Source: {job.source}
                      </p>
                    </div>
                    <div className={styles.links}>
                      <Link href={`/admin/jobs/${job.id}`}>Edit</Link>
                      {live && <Link href={`/jobs/${job.slug}`}>View</Link>}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </WorkspaceShell>
      </main>
    </div>
  );
}
