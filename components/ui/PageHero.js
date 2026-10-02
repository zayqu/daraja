import styles from "./PageHero.module.css";

export default function PageHero({
  eyebrow,
  title,
  description,
  maxWidth = "wide",
  children,
}) {
  return (
    <section className={styles.hero}>
      <div
        className={[
          styles.inner,
          maxWidth === "narrow" ? styles.narrow : "",
        ].filter(Boolean).join(" ")}
      >
        {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p className={styles.description}>{description}</p>}
        {children}
      </div>
    </section>
  );
}
