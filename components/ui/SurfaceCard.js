import styles from "./SurfaceCard.module.css";

export default function SurfaceCard({
  as: Tag = "section",
  children,
  className = "",
  tone = "default",
  ...props
}) {
  return (
    <Tag
      {...props}
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
