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
  const [pendingJobs, pendingEmployers, bookingsToAction] = await Promise.all([
    prisma.job.count({ where: { moderationStatus: "PENDING_REVIEW" } }),
    prisma.employer.count({ where: { verificationStatus: "PENDING" } }),
    // Requests to review and paid bookings to feature. A missing count must
    // never take the whole admin panel down.
    prisma.promotionBooking
      .count({ where: { status: { in: ["PENDING_REVIEW", "PAID"] } } })
      .catch(() => 0),
  ]);

  return (
    <AdminShell
      email={actor.email}
      counts={{ pendingJobs, pendingEmployers, bookingsToAction }}
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
