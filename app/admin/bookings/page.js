import Link from "next/link";
import AdminRowActions from "@/components/admin/AdminRowActions";
import { Badge, PageHeader, Pagination, Panel, formatDate, pageNumber } from "@/components/admin/AdminUi";
import styles from "@/components/admin/admin.module.css";
import { promotionActions } from "@/lib/admin-actions";
import { requireAdminPage } from "@/lib/admin-guard";
import { sandboxRoutesAvailable } from "@/lib/payments/azampay-sandbox-gate.mjs";
import { paymentProgress } from "@/lib/payments/promotion-booking.mjs";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;
const STATUS = {
  PENDING_REVIEW: ["amber", "Needs review"],
  APPROVED: ["blue", "Waiting for payment"],
  PAID: ["green", "Paid – feature it"],
  FULFILLED: ["gray", "Featured"],
  REJECTED: ["red", "Rejected"],
  CANCELLED: ["gray", "Cancelled"],
};
const PAYMENT = {
  WAITING: ["blue", "Phone prompt sent"],
  STALLED: ["amber", "No answer 15+ min"],
  UNKNOWN: ["red", "Outcome unknown"],
  FAILED: ["gray", "Last try failed"],
};

function tzs(amount) {
  return `TZS ${amount.toLocaleString("en-GB")}`;
}

export default async function AdminBookingsPage({ searchParams }) {
  await requireAdminPage("/admin/bookings");
  const params = await searchParams;
  const status = STATUS[params?.status] ? params.status : "";
  const page = pageNumber(params?.page);
  const where = status ? { status } : {};
  const [total, bookings] = await Promise.all([
    prisma.promotionBooking.count({ where }),
    prisma.promotionBooking.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true, ownerUserId: true, jobId: true, status: true, amountTzs: true,
        featuredDays: true, createdAt: true, paidAt: true, fulfilledAt: true,
        attempts: {
          orderBy: { createdAt: "desc" },
          take: 5,
          select: { status: true, checkoutState: true, createdAt: true, updatedAt: true },
        },
      },
    }),
  ]);
  // Bookings keep plain IDs (no foreign keys) so account erasure can
  // de-identify them; look the names up separately.
  const [jobs, owners] = await Promise.all([
    prisma.job.findMany({
      where: { id: { in: [...new Set(bookings.map((booking) => booking.jobId))] } },
      select: { id: true, title: true, company: true, featuredUntil: true },
    }),
    prisma.user.findMany({
      where: { id: { in: [...new Set(bookings.map((booking) => booking.ownerUserId))] } },
      select: { id: true, email: true },
    }),
  ]);
  const jobById = new Map(jobs.map((job) => [job.id, job]));
  const ownerById = new Map(owners.map((owner) => [owner.id, owner]));
  const now = new Date();

  return (
    <>
      <PageHeader
        title="Featured job bookings"
        description={
          sandboxRoutesAvailable()
            ? "Employers request a Featured slot, you approve it, they pay with mobile money, then you feature the job and post it on the WhatsApp Channel."
            : "Mobile money payments are switched off, so employers cannot request bookings here yet. Featured jobs are still booked on WhatsApp and paid by Lipa Namba."
        }
      />
      <Panel
        flush
        title={`${total} booking${total === 1 ? "" : "s"}`}
        actions={
          <form className={styles.filters} method="get">
            <select className={styles.select} name="status" defaultValue={status} aria-label="Status">
              <option value="">All bookings</option>
              {Object.entries(STATUS).map(([value, [, label]]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <button className={styles.button} type="submit">Filter</button>
          </form>
        }
      >
        {bookings.length ? (
          <div className={styles.tableWrap}>
            <table className={`${styles.table} ${styles.stackOnMobile}`}>
              <thead>
                <tr>
                  <th>Vacancy</th>
                  <th>Package</th>
                  <th>Status</th>
                  <th>Requested</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking) => {
                  const job = jobById.get(booking.jobId);
                  const owner = ownerById.get(booking.ownerUserId);
                  const payment = paymentProgress(booking.attempts, now);
                  const [tone, label] = STATUS[booking.status] || ["gray", booking.status];
                  const paymentBadge = booking.status === "APPROVED" ? PAYMENT[payment] : null;
                  return (
                    <tr key={booking.id}>
                      <td data-label="Vacancy">
                        {job ? (
                          <Link className={styles.primaryCell} href={`/admin/jobs/${job.id}`}>{job.title}</Link>
                        ) : (
                          <span className={styles.primaryCell}>Vacancy removed</span>
                        )}
                        <span className={styles.subtle}>{job?.company || "—"} · {owner?.email || "Deleted account"}</span>
                      </td>
                      <td data-label="Package">{tzs(booking.amountTzs)} · {booking.featuredDays} days</td>
                      <td data-label="Status">
                        <Badge tone={tone}>{label}</Badge>
                        {paymentBadge ? <> <Badge tone={paymentBadge[0]}>{paymentBadge[1]}</Badge></> : null}
                        {booking.status === "PAID" ? <span className={styles.subtle}>Paid {formatDate(booking.paidAt)}</span> : null}
                        {booking.status === "FULFILLED" && job?.featuredUntil ? (
                          <span className={styles.subtle}>Featured until {formatDate(job.featuredUntil)}</span>
                        ) : null}
                      </td>
                      <td data-label="Requested">{formatDate(booking.createdAt)}</td>
                      <td>
                        <AdminRowActions
                          actions={promotionActions({ ...booking, payment })}
                          links={job ? [{ label: "Edit vacancy", href: `/admin/jobs/${job.id}` }] : []}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className={styles.empty}>No bookings yet.</p>
        )}
        <Pagination page={page} pageSize={PAGE_SIZE} total={total} basePath="/admin/bookings" params={{ status }} />
      </Panel>
    </>
  );
}
