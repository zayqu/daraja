import styles from "./WorkspaceShell.module.css";

export default function WorkspaceShell({
  children,
  width = "wide",
  className = "",
}) {
  return (
    <div
      className={[
        styles.shell,
        width === "narrow" ? styles.narrow : "",
        className,
      ].filter(Boolean).join(" ")}
    >
      {children}
    </div>
  );
}
