"use client";

import { useState } from "react";
import { trackEvent } from "@/lib/analytics";

const WHATSAPP_CHANNEL =
  "https://whatsapp.com/channel/0029Vanw1OQ1CYoYdxl32g3V";

export default function JobAlerts() {
  const [email, setEmail] = useState("");
  const [interests, setInterests] = useState("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  async function subscribe(event) {
    event.preventDefault();
    if (status === "loading") return;
    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch("/api/job-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          interests,
          consent,
          website: event.currentTarget.elements.website.value,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Subscription failed.");

      setStatus("success");
      setMessage("You are subscribed. New-job updates will be sent to this email.");
      setEmail("");
      setInterests("");
      setConsent(false);
      trackEvent("sign_up", {
        method: "job_alert_email",
      });
    } catch (error) {
      setStatus("error");
      setMessage(error.message || "Please try again.");
    }
  }

  return (
    <section className="alerts" aria-labelledby="job-alerts-title">
      <div className="alerts-heading">
        <span>Never miss an opportunity</span>
        <h2 id="job-alerts-title">Get new Tanzania jobs first</h2>
        <p>Choose email alerts or follow the official Daraja WhatsApp Channel.</p>
      </div>

      <div className="alerts-grid">
        <div className="alert-card">
          <div className="alert-kicker">Email alerts</div>
          <h3>Jobs delivered to your inbox</h3>
          <p>Choose your fields and receive only matching verified vacancies.</p>
          <form onSubmit={subscribe}>
            <label htmlFor="job-alert-interests">Job fields or positions</label>
            <input
              id="job-alert-interests"
              name="interests"
              type="text"
              value={interests}
              onChange={(event) => setInterests(event.target.value)}
              placeholder="Graphic Designer, UI Designer"
              aria-describedby="job-alert-interests-help"
              required
            />
            <small id="job-alert-interests-help" className="field-help">
              Add up to five interests, separated by commas.
            </small>
            <label htmlFor="job-alert-email">Email address</label>
            <div className="email-row">
              <input
                id="job-alert-email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@example.com"
                required
              />
              <button type="submit" disabled={status === "loading"}>
                {status === "loading" ? "Joining..." : "Subscribe"}
              </button>
            </div>
            <input
              className="website-field"
              type="text"
              name="website"
              tabIndex="-1"
              autoComplete="off"
              aria-hidden="true"
            />
            <label className="consent">
              <input
                type="checkbox"
                checked={consent}
                onChange={(event) => setConsent(event.target.checked)}
                required
              />
              <span>I agree to receive Daraja job-alert emails.</span>
            </label>
            {message && (
              <p
                className={`form-message ${status}`}
                role={status === "error" ? "alert" : "status"}
              >
                {message}
              </p>
            )}
          </form>
        </div>

        <div className="alert-card whatsapp-card">
          <div className="alert-kicker">WhatsApp Channel</div>
          <h3>Follow Daraja on WhatsApp</h3>
          <p>See new vacancies and important deadline reminders in WhatsApp.</p>
          <a
            href={WHATSAPP_CHANNEL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackEvent("whatsapp_channel_click", {
              placement: "job_alerts",
            })}
          >
            Join WhatsApp Channel
          </a>
          <small>WhatsApp opens the official Daraja channel.</small>
        </div>
      </div>

      <style jsx>{`
        .alerts { max-width: 860px; margin: 0 auto; padding: 3.5rem 3rem; }
        .alerts-heading { max-width: 620px; margin-bottom: 1.5rem; }
        .alerts-heading > span, .alert-kicker { color: #087f6c; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; }
        .alerts h2 { margin: 0.45rem 0; color: #1b2a3f; font: 700 1.55rem/1.3 Montserrat, sans-serif; }
        .alerts-heading p, .alert-card p { color: #667085; font-size: 0.88rem; line-height: 1.65; }
        .alerts-grid { display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 1rem; }
        .alert-card { min-width: 0; padding: 1.5rem; background: #fff; border: 1.5px solid #e8ecf0; border-radius: 8px; }
        .alert-card h3 { margin: 0.45rem 0; color: #1b2a3f; font: 700 1rem/1.4 Montserrat, sans-serif; }
        form { margin-top: 1rem; }
        form > label:not(.consent) { display: block; margin: 0.8rem 0 0.35rem; color: #344054; font-size: 0.76rem; font-weight: 600; }
        form > label:first-child { margin-top: 0; }
        .email-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 0.5rem; }
        input[type="email"], input[name="interests"] { width: 100%; min-height: 46px; padding: 0 0.85rem; border: 1.5px solid #cfd6df; border-radius: 6px; color: #1b2a3f; font-size: 1rem; }
        .field-help { display: block; margin-top: 0.35rem; color: #667085; font-size: 0.68rem; }
        button, .whatsapp-card a { min-height: 46px; padding: 0.75rem 1rem; border: 0; border-radius: 6px; font: 700 0.8rem Poppins, sans-serif; cursor: pointer; text-decoration: none; text-align: center; }
        button { background: #00c9a7; color: #1b2a3f; }
        button:disabled { cursor: wait; opacity: 0.65; }
        .consent { display: flex; align-items: flex-start; gap: 0.55rem; margin-top: 0.75rem; color: #667085; font-size: 0.72rem; line-height: 1.5; }
        .consent input { width: 18px; height: 18px; flex: 0 0 auto; margin-top: 1px; }
        .website-field { position: absolute; left: -10000px; width: 1px; height: 1px; }
        .form-message { margin-top: 0.75rem; font-size: 0.76rem; }
        .form-message.success { color: #067647; }
        .form-message.error { color: #b42318; }
        .whatsapp-card { display: flex; flex-direction: column; align-items: flex-start; background: #f0fff5; border-color: #b7ebc8; }
        .whatsapp-card a { display: inline-flex; align-items: center; justify-content: center; width: 100%; margin-top: auto; background: #167b3c; color: #fff; }
        .whatsapp-card small { margin-top: 0.65rem; color: #667085; font-size: 0.68rem; }
        input:focus-visible, button:focus-visible, a:focus-visible { outline: 3px solid #f59e0b; outline-offset: 2px; }
        @media (max-width: 640px) {
          .alerts { padding: 2.5rem 1.25rem; }
          .alerts-grid { grid-template-columns: 1fr; }
          .email-row { grid-template-columns: 1fr; }
          button, .whatsapp-card a { width: 100%; }
        }
      `}</style>
    </section>
  );
}
