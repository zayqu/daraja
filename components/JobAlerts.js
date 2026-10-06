"use client";

import Link from "next/link";
import { trackEvent } from "@/lib/analytics";
import { WHATSAPP_CHANNEL_URL } from "@/lib/site-config";
import styles from "./JobAlerts.module.css";


export default function JobAlerts() {
  return (
    <section className={styles.alerts} aria-labelledby="job-alerts-title">
      <div className={styles.heading}>
        <span>Personalised opportunity alerts</span>
        <h2 id="job-alerts-title">Receive vacancies relevant to your career</h2>
        <p>
          Create a free candidate account, select your preferred job categories,
          and manage your alerts securely in one place.
        </p>
      </div>

      <div className={styles.grid}>
        <div className={styles.card}>
          <div className={styles.kicker}>Email alerts</div>
          <h3>Control what reaches your inbox</h3>
          <p>
            Sign in with Google or a verified email link. You can update or stop
            alerts at any time.
          </p>
          <Link
            className={styles.primaryAction}
            href="/auth/signin?callbackUrl=/account/alerts"
          >
            Sign in to manage alerts
          </Link>
        </div>

        <div className={`${styles.card} ${styles.whatsappCard}`}>
          <div className={styles.kicker}>WhatsApp Channel</div>
          <h3>Follow Daraja on WhatsApp</h3>
          <p>
            See new vacancies and important deadline reminders in WhatsApp.
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
            Join WhatsApp Channel
          </a>
          <small>WhatsApp opens the official Daraja channel.</small>
        </div>
      </div>
    </section>
  );
}
