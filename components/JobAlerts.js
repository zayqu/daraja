"use client";

import { useEffect, useState } from "react";
import CATEGORIES from "@/config/job-categories.json";

const WHATSAPP_CHANNEL =
  "https://whatsapp.com/channel/0029Vanw1OQ1CYoYdxl32g3V";

export default function JobAlerts({ initialCategory = "" }) {
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState(
    CATEGORIES.includes(initialCategory) ? initialCategory : ""
  );
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (CATEGORIES.includes(initialCategory)) setCategory(initialCategory);
  }, [initialCategory]);

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
          category,
          consent,
          website: event.currentTarget.elements.website.value,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Subscription failed.");

      setStatus("success");
      setMessage(`Your alert is active. We’ll email you when new ${category} vacancies are published.`);
      setEmail("");
      setConsent(false);
    } catch (error) {
      setStatus("error");
      setMessage(error.message || "Please try again.");
    }
  }

  return (
    <section className="alerts" aria-labelledby="job-alerts-title">
      <div className="alerts-heading">
        <span>Personalised job alerts</span>
        <h2 id="job-alerts-title">Receive relevant opportunities</h2>
        <p>Select a professional category and choose how you would like to stay informed.</p>
      </div>

      <div className="alerts-grid">
        <div className="alert-card">
          <div className="alert-kicker">Email alerts</div>
          <h3>Create a category-specific alert</h3>
          <p>We will email you when verified vacancies are published in your selected category.</p>
          <form onSubmit={subscribe}>
            <label htmlFor="job-alert-category">Job category</label>
            <select
              id="job-alert-category"
              name="category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              required
            >
              <option value="">Select a category</option>
              {CATEGORIES.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
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
                {status === "loading" ? "Creating alert..." : "Create job alert"}
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
              <span>I agree to receive relevant job alerts from Daraja. I can unsubscribe at any time.</span>
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
          <div className="alert-kicker">WhatsApp updates</div>
          <h3>Follow Daraja Jobs</h3>
          <p>Receive broader vacancy updates and deadline reminders through our official WhatsApp Channel.</p>
          <a href={WHATSAPP_CHANNEL} target="_blank" rel="noopener noreferrer">
            Follow on WhatsApp
          </a>
          <small>Opens the official Daraja Jobs channel.</small>
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
        input[type="email"], select { width: 100%; min-height: 48px; padding: 0 0.85rem; border: 1.5px solid #cfd6df; border-radius: 6px; background: #fff; color: #1b2a3f; font-size: 1rem; }
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
        input:focus-visible, select:focus-visible, button:focus-visible, a:focus-visible { outline: 3px solid #f59e0b; outline-offset: 2px; }
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
