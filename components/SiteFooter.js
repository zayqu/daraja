import Link from "next/link";
import styles from "./SiteFooter.module.css";
import VisitorCounter from "@/components/VisitorCounter";

const WHATSAPP_CHANNEL =
  "https://whatsapp.com/channel/0029Vanw1OQ1CYoYdxl32g3V";

export default function SiteFooter({ visitorsThisMonth = null }) {
  return (
    <footer className={styles.footer}>
      {visitorsThisMonth !== null && (
        <section className={styles.visitorInsight} aria-label="Daraja visitor insight">
          <div>
            <span className={styles.visitorLabel}>Visitor insight</span>
            <p>Privacy-safe monthly visitor activity.</p>
          </div>
          <VisitorCounter initialCount={visitorsThisMonth} />
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
