import styles from "./SiteFooter.module.css";

export default function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div>
          <div className={styles.logo}>DARAJA</div>
          <div className={styles.sub}>Kazi Na Fursa Tanzania</div>
        </div>
        <div className={styles.copy}>
          {new Date().getFullYear()} Daraja. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
