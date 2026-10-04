import Link from "next/link";
import styles from "./SiteFooter.module.css";
import VisitorCounter from "@/components/VisitorCounter";

const WHATSAPP_CHANNEL =
  "https://whatsapp.com/channel/0029Vanw1OQ1CYoYdxl32g3V";

export default function SiteFooter({ stats = null }) {
  return (
    <footer className={styles.footer}>
      {stats && (
        <section className={styles.insights} aria-label="Daraja live platform insights">
          <div className={styles.insightsHeading}>
            <span>Daraja at a glance</span>
            <p>Live platform activity, updated from verified Daraja data.</p>
          </div>
          <div className={styles.insightsGrid}>
            <div className={styles.insight}>
              <strong>{stats.liveJobs.toLocaleString()}</strong>
              <span>Live opportunities</span>
            </div>
            <div className={styles.insight}>
              <strong>{stats.employers.toLocaleString()}</strong>
              <span>Employers & institutions</span>
            </div>
            <div className={styles.insight}>
              <strong>{stats.sources.toLocaleString()}</strong>
              <span>Verified active sources</span>
            </div>
            <div className={styles.insight}>
              <VisitorCounter initialCount={stats.visitorsThisMonth} />
            </div>
          </div>
        </section>
      )}

      <div className={styles.inner}>
        <div className={styles.brand}>
          <div className={styles.logo}>DARAJA</div>
          <div className={styles.sub}>Kazi Na Fursa Tanzania</div>
          <p>
            A clearer way to discover current opportunities and follow the
            correct application source.
          </p>
        </div>

        <div className={styles.column}>
          <div className={styles.heading}>Explore</div>
          <Link href="/jobs">Browse jobs</Link>
          <Link href="/jobs?category=Government">Government</Link>
          <Link href="/jobs?category=NGO%20%26%20Development">NGO & Development</Link>
          <Link href="/jobs?category=Internships%20%26%20Graduate%20Programs">Internships</Link>
        </div>

        <div className={styles.column}>
          <div className={styles.heading}>Stay connected</div>
          <a href={WHATSAPP_CHANNEL} target="_blank" rel="noopener noreferrer">
            WhatsApp Channel
          </a>
          <Link href="/account/alerts">Job alerts</Link>
          <Link href="/contact">Contact Daraja</Link>
        </div>
      </div>

      <div className={styles.bottom}>
        <span>{new Date().getFullYear()} Daraja. All rights reserved.</span>
        <span>Jobs and opportunities across Tanzania.</span>
      </div>
    </footer>
  );
}
