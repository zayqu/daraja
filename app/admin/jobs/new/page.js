import { notFound, redirect } from "next/navigation";
import AdminJobForm from "@/components/AdminJobForm";
import AdminTabs from "@/components/AdminTabs";
import SiteNav from "@/components/SiteNav";
import PageHero from "@/components/ui/PageHero";
import SurfaceCard from "@/components/ui/SurfaceCard";
import WorkspaceShell from "@/components/ui/WorkspaceShell";
import { getActor, isAdmin } from "@/lib/employer-access";
import styles from "../../../portal.module.css";

export const metadata = { title: "Post a vacancy | Daraja admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminNewJobPage() {
  const actor = await getActor();
  if (!actor) redirect("/auth/signin?callbackUrl=/admin/jobs/new");
  if (!isAdmin(actor)) notFound();

  return (
    <div className={styles.page}>
      <SiteNav />
      <main id="main-content">
        <PageHero
          eyebrow="Administration"
          title="Post a vacancy."
          description="Copy the details from the employer's advert. The vacancy goes live as soon as you post it."
        />
        <WorkspaceShell className={styles.formScope}>
          <AdminTabs />
          <SurfaceCard className={styles.formCard}>
            <AdminJobForm />
          </SurfaceCard>
        </WorkspaceShell>
      </main>
    </div>
  );
}
