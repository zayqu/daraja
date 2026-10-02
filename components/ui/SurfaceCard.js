import styles from "./SurfaceCard.module.css";

export default function SurfaceCard({
  as: Tag = "section",
  children,
  className = "",
  tone = "default",
}) {
  return (
    <Tag
      className={[
        styles.card,
        tone === "danger" ? styles.danger : "",
        className,
      ].filter(Boolean).join(" ")}
    >
      {children}
    </Tag>
  );
}
