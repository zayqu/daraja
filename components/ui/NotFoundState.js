import Link from "next/link";
import styles from "./NotFoundState.module.css";

// Figma "State · Not found": a quiet bridge mark, one line of explanation and
// one clear way back. Used by the site 404, a missing job and the job page.
export default function NotFoundState({ title, text, actionHref = "/jobs", actionLabel, secondary = null, as: Tag = "section" }) {
  return (
    <Tag className={styles.state} id={Tag === "main" ? "main-content" : undefined}>
      <span className={styles.mark} aria-hidden="true">
        <svg viewBox="0 0 120 80" focusable="false">
          <path d="M8 58h104" />
          <path d="M16 58c10-24 26-36 44-36" />
          <path d="M104 58c-6-14-14-24-24-30" strokeDasharray="4 6" />
          <path d="M30 58V44M44 58V32M60 58V22" />
          <circle cx="90" cy="20" r="9" />
          <path d="m96.5 26.5 7 7" />
        </svg>
      </span>
      <h1>{title}</h1>
      <p>{text}</p>
      <Link className={styles.action} href={actionHref}>{actionLabel}</Link>
      {secondary ? <div className={styles.secondary}>{secondary}</div> : null}
    </Tag>
  );
}
