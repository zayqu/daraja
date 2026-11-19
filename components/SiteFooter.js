"use client";

import Link from "next/link";
import { useT } from "@/components/LanguageProvider";
import styles from "./SiteFooter.module.css";
import TrafficNumbers from "@/components/TrafficNumbers";
import { WHATSAPP_CHANNEL_URL } from "@/lib/site-config";


export default function SiteFooter({ platformStats = null }) {
  const t = useT();
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <div className={styles.logo}>DARAJA</div>
          <div className={styles.sub}>Kazi Na Fursa Tanzania</div>
          <p>
            {t("A clearer way to discover current opportunities and follow the correct application source.")}
          </p>
        </div>

        <div className={styles.column}>
          <div className={styles.heading}>{t("Explore")}</div>
          <Link href="/jobs">{t("Browse jobs")}</Link>
          <Link href="/jobs?category=Government">{t("Government")}</Link>
          <Link href="/jobs?category=NGO%20%26%20Development">{t("NGO & Development")}</Link>
          <Link href="/jobs?category=Internships%20%26%20Graduate%20Programs">{t("Internships")}</Link>
          <Link href="/sectors">{t("Jobs by sector")}</Link>
          <Link href="/career-guides">{t("Career guides")}</Link>
        </div>

        <div className={styles.column}>
          <div className={styles.heading}>{t("Stay connected")}</div>
          <a href={WHATSAPP_CHANNEL_URL} target="_blank" rel="noopener noreferrer">
            {t("WhatsApp Channel")}
          </a>
          <Link href="/account/alerts">{t("Job alerts")}</Link>
          <Link href="/contact">{t("Contact Daraja")}</Link>
        </div>
      </div>

      <section className={styles.insights} aria-label="Daraja platform and visitor insights">
        {platformStats && (
          <div className={styles.platformInsights}>
            <div>
              <strong>{platformStats.liveJobs.toLocaleString()}</strong>
              <span>{t("Live opportunities")}</span>
            </div>
            <div>
              <strong>{platformStats.employers.toLocaleString()}</strong>
              <span>{t("Employers & institutions")}</span>
            </div>
            <div>
              <strong>{platformStats.sources.toLocaleString()}</strong>
              <span>{t("Verified sources")}</span>
            </div>
            <div>
              <strong>{platformStats.categories.toLocaleString()}</strong>
              <span>{t("Job categories")}</span>
            </div>
          </div>
        )}
        <div className={styles.visitorInsights}>
          <span className={styles.insightLabel}>{t("Visitor insights")}</span>
          <TrafficNumbers className={styles.trafficMeta} />
        </div>
      </section>

      <div className={styles.bottom}>
        <span>{t("{year} Daraja. All rights reserved.", { year: new Date().getFullYear() })}</span>
        <div className={styles.bottomMeta}>
          <span>{t("Jobs and opportunities across Tanzania.")}</span>
        </div>
      </div>
    </footer>
  );
}
