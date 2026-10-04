import Link from "next/link";
import styles from "./SiteFooter.module.css";


const WHATSAPP_CHANNEL =
  "https://whatsapp.com/channel/0029Vanw1OQ1CYoYdxl32g3V";

function formatCompactCount(value) {
  const count = Number(value) || 0;
  if (count < 1_000) return count.toLocaleString();

  const units = [
    { threshold: 1_000_000_000, suffix: "B" },
    { threshold: 1_000_000, suffix: "M" },
    { threshold: 1_000, suffix: "K" },
  ];

  const unit = units.find(({ threshold }) => count >= threshold);
  if (!unit) return count.toLocaleString();

  const scaled = count / unit.threshold;
  const decimals = scaled < 10 ? 2 : scaled < 100 ? 1 : 0;
  return `${Number(scaled.toFixed(decimals))}${unit.suffix}`;
}

export default function SiteFooter({ traffic = null }) {
  return (
    <footer className={styles.footer}>
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
        <div className={styles.bottomMeta}>
          <span>Jobs and opportunities across Tanzania.</span>
          {traffic && (
            <span className={styles.trafficMeta} aria-label="Daraja visitor numbers">
              <span><strong>{formatCompactCount(traffic.totalVisits)}</strong> Visits</span>
              <span><strong>{formatCompactCount(traffic.newVisitors)}</strong> New</span>
              <span><strong>{formatCompactCount(traffic.returningVisitors)}</strong> Returning</span>
              <span><strong>{formatCompactCount(traffic.pageViews)}</strong> Page views</span>
            </span>
          )}
        </div>
      </div>
    </footer>
  );
}
