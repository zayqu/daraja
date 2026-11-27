"use client";

import Link from "next/link";
import { trackEvent } from "@/lib/analytics";
import { WHATSAPP_CHANNEL_URL } from "@/lib/site-config";
import { useT } from "@/components/LanguageProvider";
import styles from "./JobAlerts.module.css";


export default function JobAlerts() {
  const t = useT();
  return (
    <section className={styles.alerts} aria-labelledby="job-alerts-title">
      <div className={styles.heading}>
        <span>{t("Personalised opportunity alerts")}</span>
        <h2 id="job-alerts-title">{t("Receive vacancies relevant to your career")}</h2>
        <p>
          {t("Create a free candidate account, select your preferred job categories, and manage your alerts securely in one place.")}
        </p>
      </div>

      <div className={styles.grid}>
        <div className={styles.card}>
          <div className={styles.kicker}>{t("Email alerts")}</div>
          <h3>{t("Control what reaches your inbox")}</h3>
          <p>
            {t("Sign in with your email and password or with Google. You can update or stop alerts at any time.")}
          </p>
          <Link
            className={styles.primaryAction}
            href="/auth/signin?callbackUrl=/account/alerts"
          >
            {t("Sign in to manage alerts")}
          </Link>
        </div>

        <div className={`${styles.card} ${styles.whatsappCard}`}>
          <div className={styles.kicker}>WhatsApp Channel</div>
          <h3>{t("Follow Daraja on WhatsApp")}</h3>
          <p>
            {t("See new vacancies and important deadline reminders in WhatsApp.")}
          </p>
          <a
            className={styles.whatsappAction}
            href={WHATSAPP_CHANNEL_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() =>
              trackEvent("whatsapp_channel_click", {
                placement: "job_alerts",
              })
            }
          >
            {t("Join WhatsApp Channel")}
          </a>
          <small>{t("WhatsApp opens the official Daraja channel.")}</small>
        </div>
      </div>
    </section>
  );
}
