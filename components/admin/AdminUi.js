import Link from "next/link";
import styles from "./admin.module.css";

export function PageHeader({ title, description, actions }) {
  return (
    <header className={styles.pageHeader}>
      <div>
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className={styles.headerActions}>{actions}</div> : null}
    </header>
  );
}

export function Panel({ title, actions, children, flush = false }) {
  return (
    <section className={styles.panel}>
      {title || actions ? (
        <div className={styles.panelHead}>
          {title ? <h2>{title}</h2> : <span />}
          {actions}
        </div>
      ) : null}
      {flush ? children : <div className={styles.panelBody}>{children}</div>}
    </section>
  );
}

export function StatCard({ label, value, note, href }) {
  const content = (
    <>
      <span>{label}</span>
      <strong>{value}</strong>
      {note ? <em>{note}</em> : null}
    </>
  );
  return href ? (
    <Link className={styles.stat} href={href}>{content}</Link>
  ) : (
    <div className={styles.stat}>{content}</div>
  );
}

const TONES = {
  green: styles.badgeGreen,
  amber: styles.badgeAmber,
  red: styles.badgeRed,
  blue: styles.badgeBlue,
  gray: styles.badgeGray,
};

export function Badge({ tone = "gray", children }) {
  return <span className={`${styles.badge} ${TONES[tone] || ""}`}>{children}</span>;
}

const JOB_STATUS = {
  PUBLISHED: ["green", "Live"],
  PENDING_REVIEW: ["amber", "Needs review"],
  REJECTED: ["red", "Rejected"],
  ARCHIVED: ["gray", "Archived"],
  DRAFT: ["blue", "Draft"],
};

export function JobStatusBadge({ status, active }) {
  const [tone, label] = JOB_STATUS[status] || ["gray", status];
  if (status === "PUBLISHED" && !active) return <Badge tone="gray">Closed</Badge>;
  return <Badge tone={tone}>{label}</Badge>;
}

// Previous / next links that keep the current filters in the URL.
export function Pagination({ page, pageSize, total, basePath, params = {} }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const link = (target) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) if (value) query.set(key, value);
    if (target > 1) query.set("page", String(target));
    const text = query.toString();
    return text ? `${basePath}?${text}` : basePath;
  };
  const from = total ? (page - 1) * pageSize + 1 : 0;
  const to = Math.min(total, page * pageSize);
  return (
    <div className={styles.pagination}>
      <span>
        {from}–{to} of {total}
      </span>
      <span className={styles.headerActions}>
        {page > 1 ? <Link className={styles.button} href={link(page - 1)}>Previous</Link> : null}
        {page < pages ? <Link className={styles.button} href={link(page + 1)}>Next</Link> : null}
      </span>
    </div>
  );
}

export function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function pageNumber(value) {
  const page = Number.parseInt(value, 10);
  return Number.isFinite(page) && page > 0 ? Math.min(page, 10_000) : 1;
}
