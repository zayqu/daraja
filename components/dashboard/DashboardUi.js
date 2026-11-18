import Link from "next/link";
import NavIcon from "@/components/ui/NavIcon";
import styles from "./dashboard.module.css";

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

// --- Overview widgets shared by the employer and candidate dashboards ---

// Two big numbers side by side (the reference's highlight card).
export function HighlightStats({ items }) {
  return (
    <section className={styles.highlight} aria-label="Summary">
      {items.map((item) => {
        const body = (
          <>
            <span className={styles.highlightIcon} aria-hidden="true">
              <NavIcon name={item.icon} size={22} />
            </span>
            <strong>{item.value}</strong>
            <span>{item.label}</span>
          </>
        );
        return item.href ? (
          <Link key={item.label} href={item.href} className={styles.highlightItem}>{body}</Link>
        ) : (
          <div key={item.label} className={styles.highlightItem}>{body}</div>
        );
      })}
    </section>
  );
}

const DONUT_COLORS = {
  teal: "var(--color-teal)",
  navy: "var(--color-navy)",
  amber: "#f5a524",
  red: "#e5484d",
  gray: "#d0d5dd",
};

// A ring chart of counts with a legend. Segments with a zero count are listed
// but take no space; an empty dataset shows a grey ring.
export function DonutCard({ title, segments, footer }) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  let start = 0;
  const stops = total
    ? segments
        .filter((segment) => segment.value > 0)
        .map((segment) => {
          const end = start + (segment.value / total) * 360;
          const stop = `${DONUT_COLORS[segment.tone]} ${start}deg ${end}deg`;
          start = end;
          return stop;
        })
        .join(", ")
    : `${DONUT_COLORS.gray} 0deg 360deg`;
  return (
    <section className={styles.card} aria-label={title}>
      <h2 className={styles.cardTitle}>{title}</h2>
      <div className={styles.donutRow}>
        <div className={styles.donut} style={{ background: `conic-gradient(${stops})` }} role="img" aria-label={`${total} in total`}>
          <span>{total}</span>
        </div>
        <ul className={styles.legend}>
          {segments.map((segment) => (
            <li key={segment.label}>
              <span className={styles.legendDot} style={{ background: DONUT_COLORS[segment.tone] }} aria-hidden="true" />
              {segment.label}
              <strong>{segment.value}</strong>
            </li>
          ))}
        </ul>
      </div>
      {footer ? <div className={styles.cardFooter}>{footer}</div> : null}
    </section>
  );
}

export function ListCard({ title, action, footer, children }) {
  return (
    <section className={styles.card} aria-label={title}>
      <div className={styles.cardHead}>
        <h2 className={styles.cardTitle}>{title}</h2>
        {action}
      </div>
      {children}
      {footer ? <div className={styles.cardFooter}>{footer}</div> : null}
    </section>
  );
}

function initialsOf(text) {
  const words = String(text || "?").replace(/[^\p{L}\p{N} ]/gu, " ").trim().split(/\s+/).filter(Boolean);
  return ((words[0]?.[0] || "?") + (words[1]?.[0] || "")).toUpperCase();
}

// One vacancy, application or saved job in a list.
// One row of a dashboard list. The round avatar shows the initials of
// `avatarText` (by default the subtitle, e.g. the company of a job).
export function ListRow({ title, href, subtitle, meta, badge, actions, note, avatarText }) {
  return (
    <li className={styles.listRow}>
      <span className={styles.rowAvatar} aria-hidden="true">{initialsOf(avatarText || subtitle || title)}</span>
      <div className={styles.rowMain}>
        {href ? <Link href={href}>{title}</Link> : <strong>{title}</strong>}
        <span>{[subtitle, ...(meta || [])].filter(Boolean).join(" · ")}</span>
      </div>
      {badge ? <div className={styles.rowBadge}>{badge}</div> : null}
      {actions ? <div className={styles.rowActionsInline}>{actions}</div> : null}
      {note ? <p className={styles.rowNote}>{note}</p> : null}
    </li>
  );
}

export function ListRows({ children }) {
  return <ul className={styles.listRows}>{children}</ul>;
}

export function EmptyState({ title, text, action }) {
  return (
    <div className={styles.emptyState}>
      <strong>{title}</strong>
      {text ? <p>{text}</p> : null}
      {action}
    </div>
  );
}

const NOTICE_TONES = { info: styles.noticeInfo, warning: styles.noticeWarning, danger: styles.noticeDanger };

export function Notice({ tone = "info", title, children, action }) {
  return (
    <div className={`${styles.noticeBox} ${NOTICE_TONES[tone] || ""}`} role="status">
      <div>
        {title ? <strong>{title}</strong> : null}
        {children ? <p>{children}</p> : null}
      </div>
      {action}
    </div>
  );
}

// Whole days left until a closing date (Tanzania time); negative once closed.
export function daysUntil(date, now = new Date()) {
  const dayKey = (value) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Dar_es_Salaam" }).format(new Date(value));
  const ms = new Date(dayKey(date)).getTime() - new Date(dayKey(now)).getTime();
  return Math.round(ms / 86_400_000);
}

export function closingLabel(date, now = new Date()) {
  if (!date) return null;
  const days = daysUntil(date, now);
  if (days < 0) return `Closed ${formatDate(date)}`;
  if (days === 0) return "Closes today";
  return `Closes ${formatDate(date)}`;
}

export function DaysLeftBadge({ date, now = new Date() }) {
  if (!date) return null;
  const days = daysUntil(date, now);
  if (days < 0) return <Badge tone="gray">Closed</Badge>;
  const label = days === 0 ? "Closes today" : `${days} day${days === 1 ? "" : "s"} to apply`;
  return <Badge tone={days <= 3 ? "red" : days <= 7 ? "amber" : "green"}>{label}</Badge>;
}
