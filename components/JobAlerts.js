"use client";

import Link from "next/link";
import { trackEvent } from "@/lib/analytics";

const WHATSAPP_CHANNEL =
  "https://whatsapp.com/channel/0029Vanw1OQ1CYoYdxl32g3V";

export default function JobAlerts() {
  return (
    <section className="alerts" aria-labelledby="job-alerts-title">
      <div className="alerts-heading">
        <span>Personalised opportunity alerts</span>
        <h2 id="job-alerts-title">Receive vacancies relevant to your career</h2>
        <p>
          Create a free candidate account, select your preferred job categories,
          and manage your alerts securely in one place.
        </p>
      </div>
      <div className="alerts-grid">
        <div className="alert-card">
          <div className="alert-kicker">Email alerts</div>
          <h3>Control what reaches your inbox</h3>
          <p>
            Sign in with Google or a verified email link. You can update or stop
            alerts at any time.
          </p>
          <Link className="primary-action" href="/auth/signin?callbackUrl=/account/alerts">
            Sign in to manage alerts
          </Link>
        </div>
        <div className="alert-card whatsapp-card">
          <div className="alert-kicker">WhatsApp Channel</div>
          <h3>Follow Daraja on WhatsApp</h3>
          <p>See new vacancies and important deadline reminders in WhatsApp.</p>
          <a
            href={WHATSAPP_CHANNEL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackEvent("whatsapp_channel_click", { placement: "job_alerts" })}
          >
            Join WhatsApp Channel
          </a>
          <small>WhatsApp opens the official Daraja channel.</small>
        </div>
      </div>
      <style jsx>{`
        .alerts { max-width: 860px; margin: 0 auto; padding: 3.5rem 3rem; }
        .alerts-heading { max-width: 620px; margin-bottom: 1.5rem; }
        .alerts-heading > span, .alert-kicker { color: #087f6c; font-size: .7rem; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; }
        .alerts h2 { margin: .45rem 0; color: #1b2a3f; font-size: 1.55rem; line-height: 1.3; }
        .alerts-heading p, .alert-card p { color: #667085; font-size: .88rem; line-height: 1.65; }
        .alerts-grid { display: grid; grid-template-columns: 1.2fr .8fr; gap: 1rem; }
        .alert-card { display: flex; min-width: 0; padding: 1.5rem; flex-direction: column; align-items: flex-start; background: #fff; border: 1.5px solid #e8ecf0; border-radius: 8px; }
        .alert-card h3 { margin: .45rem 0; color: #1b2a3f; font-size: 1rem; line-height: 1.4; }
        .primary-action, .whatsapp-card a { display: inline-flex; width: 100%; min-height: 46px; margin-top: auto; padding: .75rem 1rem; align-items: center; justify-content: center; border-radius: 6px; background: #00c9a7; color: #1b2a3f; font-size: .8rem; font-weight: 700; text-decoration: none; text-align: center; }
        .whatsapp-card { background: #f0fff5; border-color: #b7ebc8; }
        .whatsapp-card a { background: #167b3c; color: #fff; }
        .whatsapp-card small { margin-top: .65rem; color: #667085; font-size: .68rem; }
        a:focus-visible { outline: 3px solid #f59e0b; outline-offset: 2px; }
        @media (max-width: 640px) {
          .alerts { padding: 2.5rem 1.25rem; }
          .alerts-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </section>
  );
}
