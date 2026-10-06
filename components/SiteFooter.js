import Link from "next/link";
import styles from "./SiteFooter.module.css";
import TrafficNumbers from "@/components/TrafficNumbers";
import { WHATSAPP_CHANNEL_URL } from "@/lib/site-config";


export default function SiteFooter() {
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
          <Link href="/sectors">Jobs by sector</Link>
          <Link href="/career-guides">Career guides</Link>
        </div>

        <div className={styles.column}>
          <div className={styles.heading}>Stay connected</div>
          <a href={WHATSAPP_CHANNEL_URL} target="_blank" rel="noopener noreferrer">
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
          <TrafficNumbers className={styles.trafficMeta} />
        </div>
      </div>
    </footer>
  );
}
