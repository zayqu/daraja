import AdminRowActions from "@/components/admin/AdminRowActions";
import { Badge, PageHeader, Pagination, Panel, formatDate, pageNumber } from "@/components/admin/AdminUi";
import UserRoleSelect from "@/components/admin/UserRoleSelect";
import styles from "@/components/admin/admin.module.css";
import { requireAdminPage } from "@/lib/admin-guard";
import { isOwnerEmail } from "@/lib/platform-roles";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;
const ROLE_FILTERS = [
  ["", "All roles"],
  ["JOB_SEEKER", "Candidates"],
  ["EMPLOYER", "Employers"],
  ["ADMIN", "Admins"],
];
const STATE_FILTERS = [
  ["", "Any status"],
  ["active", "Active"],
  ["suspended", "Suspended"],
  ["unconfirmed", "Email not confirmed"],
];

function stateWhere(state) {
  if (state === "suspended") return { suspendedAt: { not: null } };
  if (state === "active") return { suspendedAt: null };
  if (state === "unconfirmed") return { emailVerified: null, accounts: { none: {} } };
  return {};
}

export default async function AdminUsersPage({ searchParams }) {
  const actor = await requireAdminPage("/admin/users");
  const params = await searchParams;
  const q = String(params?.q || "").trim().slice(0, 120);
  const role = ROLE_FILTERS.some(([value]) => value && value === params?.role) ? params.role : "";
  const state = STATE_FILTERS.some(([value]) => value && value === params?.state) ? params.state : "";
  const page = pageNumber(params?.page);

  const where = {
    ...(role ? { role } : {}),
    ...stateWhere(state),
    ...(q
      ? {
          OR: [
            { email: { contains: q, mode: "insensitive" } },
            { name: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [total, users, byRole] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        emailVerified: true,
        suspendedAt: true,
        suspendedReason: true,
        createdAt: true,
        password: true,
        accounts: { select: { provider: true } },
        employer: { select: { companyName: true } },
      },
    }),
    prisma.user.groupBy({ by: ["role"], _count: { _all: true } }),
  ]);
  const roleCount = Object.fromEntries(byRole.map((entry) => [entry.role, entry._count._all]));

  return (
    <>
      <PageHeader
        title="Users"
        description={`${roleCount.JOB_SEEKER || 0} candidates · ${roleCount.EMPLOYER || 0} employers · ${roleCount.ADMIN || 0} admins`}
      />
      <Panel
        flush
        title={`${total} user${total === 1 ? "" : "s"}`}
        actions={
          <form className={styles.filters} method="get">
            <input className={styles.input} type="search" name="q" defaultValue={q} placeholder="Search name or email" aria-label="Search users" />
            <select className={styles.select} name="role" defaultValue={role} aria-label="Role">
              {ROLE_FILTERS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <select className={styles.select} name="state" defaultValue={state} aria-label="Status">
              {STATE_FILTERS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <button className={styles.button} type="submit">Filter</button>
          </form>
        }
      >
        {users.length ? (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Signs in with</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const owner = isOwnerEmail(user.email);
                  const self = user.id === actor.id;
                  const methods = [
                    ...(user.password ? ["Password"] : []),
                    ...user.accounts.map((account) => (account.provider === "google" ? "Google" : account.provider)),
                  ];
                  const confirmed = Boolean(user.emailVerified) || user.accounts.length > 0;
                  return (
                    <tr key={user.id}>
                      <td>
                        <span className={styles.primaryCell}>{user.name || user.email}</span>
                        <span className={styles.subtle}>
                          {user.email}
                          {user.employer ? ` · ${user.employer.companyName}` : ""}
                        </span>
                      </td>
                      <td>
                        <UserRoleSelect userId={user.id} role={user.role} locked={owner || self} />
                        {owner ? <span className={styles.subtle}>Owner</span> : null}
                      </td>
                      <td>{methods.join(", ") || "Email link (old)"}</td>
                      <td>
                        {user.suspendedAt ? (
                          <>
                            <Badge tone="red">Suspended</Badge>
                            <span className={styles.subtle}>{user.suspendedReason}</span>
                          </>
                        ) : confirmed ? (
                          <Badge tone="green">Active</Badge>
                        ) : (
                          <Badge tone="amber">Email not confirmed</Badge>
                        )}
                      </td>
                      <td>{formatDate(user.createdAt)}</td>
                      <td>
                        {owner || self ? null : (
                          <AdminRowActions
                            actions={[
                              user.suspendedAt
                                ? { label: "Reinstate", url: `/api/admin/users/${user.id}`, body: { suspended: false } }
                                : {
                                    label: "Suspend",
                                    url: `/api/admin/users/${user.id}`,
                                    body: { suspended: true },
                                    askReason: `Why are you suspending ${user.email}? They will be signed out and cannot sign in.`,
                                  },
                              {
                                label: "Delete",
                                method: "DELETE",
                                url: `/api/admin/users/${user.id}`,
                                confirm: `Permanently delete ${user.email} and their private data (profile, CVs, applications, alerts)? This cannot be undone.`,
                                tone: "danger",
                              },
                            ]}
                          />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className={styles.empty}>No users match these filters.</p>
        )}
        <Pagination page={page} pageSize={PAGE_SIZE} total={total} basePath="/admin/users" params={{ q, role, state }} />
      </Panel>
    </>
  );
}
