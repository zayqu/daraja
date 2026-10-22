import { signOut } from "@/auth";
import AdminShell from "@/components/admin/AdminShell";
import { requireAdminPage } from "@/lib/admin-guard";
import prisma from "@/lib/prisma";

export const metadata = {
  title: "Admin | Daraja",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }) {
  const actor = await requireAdminPage();
  const [pendingJobs, pendingEmployers] = await Promise.all([
    prisma.job.count({ where: { moderationStatus: "PENDING_REVIEW" } }),
    prisma.employer.count({ where: { verificationStatus: "PENDING" } }),
  ]);

  return (
    <AdminShell
      email={actor.email}
      counts={{ pendingJobs, pendingEmployers }}
      signOut={
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}
        >
          <button type="submit">Sign out</button>
        </form>
      }
    >
      {children}
    </AdminShell>
  );
}
