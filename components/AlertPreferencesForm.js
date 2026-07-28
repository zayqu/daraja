"use client";

import { useState } from "react";
import {
  EXPERIENCE_LEVELS,
  JOB_CATEGORIES,
  WORK_ARRANGEMENTS,
} from "@/lib/job-categories";
import { trackEvent } from "@/lib/analytics";

function parseList(value) {
  return [...new Set(
    value.split(",").map((item) => item.replace(/\s+/g, " ").trim()).filter(Boolean)
  )];
}

export default function AlertPreferencesForm({ initialPreferences }) {
  const [categories, setCategories] = useState(initialPreferences?.categories || []);
  const [experienceLevels, setExperienceLevels] = useState(
    initialPreferences?.experienceLevels || []
  );
  const [workArrangements, setWorkArrangements] = useState(
    initialPreferences?.workArrangements || []
  );
  const [locations, setLocations] = useState(
    (initialPreferences?.locations || []).join(", ")
  );
  const [organisations, setOrganisations] = useState(
    (initialPreferences?.organisations || []).join(", ")
  );
  const [keywords, setKeywords] = useState(
    (initialPreferences?.keywords || []).join(", ")
  );
  const [missingField, setMissingField] = useState("");
  const [consent, setConsent] = useState(false);
  const [alertsActive, setAlertsActive] = useState(Boolean(initialPreferences?.active));
  const [lastSaved, setLastSaved] = useState(null);
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  function toggle(value, selected, update) {
    update(selected.includes(value)
      ? selected.filter((item) => item !== value)
      : [...selected, value]);
  }

  async function save(event) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");
    try {
      const keywordValues = parseList(keywords);
      const requestedField = missingField.replace(/\s+/g, " ").trim();
      if (requestedField && !keywordValues.some(
        (value) => value.toLowerCase() === requestedField.toLowerCase()
      )) {
        keywordValues.push(requestedField);
      }
      const response = await fetch("/api/job-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categories,
          locations: parseList(locations),
          experienceLevels,
          workArrangements,
          organisations: parseList(organisations),
          keywords: keywordValues,
          consent,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Preferences could not be saved.");
      setLastSaved(data.preferences);
      setAlertsActive(true);
      setCategories([]);
      setExperienceLevels([]);
      setWorkArrangements([]);
      setLocations("");
      setOrganisations("");
      setKeywords("");
      setMissingField("");
      setConsent(false);
      setStatus("success");
      setMessage("Your alert preferences have been saved. This form is ready for a new selection.");
      trackEvent("sign_up", { method: "authenticated_job_alert" });
    } catch (error) {
      setStatus("error");
      setMessage(error.message || "Please try again.");
    }
  }

  async function disableAlerts() {
    if (!window.confirm("Stop all email job alerts for this account?")) return;
    setStatus("loading");
    const response = await fetch("/api/job-alerts", { method: "DELETE" });
    if (response.ok) {
      setAlertsActive(false);
      setStatus("success");
      setMessage("Email job alerts are now paused.");
    } else {
      setStatus("error");
      setMessage("Alerts could not be paused. Please try again.");
    }
  }

  return (
    <form className="preferences" onSubmit={save}>
      {lastSaved && (
        <section className="saved-summary" aria-labelledby="saved-title">
          <div className="saved-mark" aria-hidden="true">✓</div>
          <div>
            <h2 id="saved-title">Preferences saved</h2>
            <p>
              Alerts are active for {lastSaved.categories.length} selected
              {lastSaved.categories.length === 1 ? " category" : " categories"}.
              We cleared the form to prevent accidental duplicate submissions.
            </p>
          </div>
        </section>
      )}
      <fieldset>
        <legend>Job categories <span>Required</span></legend>
        <p>Select one or more categories. Alerts use these exact categories.</p>
        <div className="choice-grid">
          {JOB_CATEGORIES.map((category) => (
            <label key={category}>
              <input
                type="checkbox"
                checked={categories.includes(category)}
                onChange={() => toggle(category, categories, setCategories)}
              />
              <span>{category}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>Optional refinements</legend>
        <p>Leave any field empty when you do not want it to limit your alerts.</p>
        <label className="text-label" htmlFor="alert-locations">Preferred locations</label>
        <input
          id="alert-locations"
          value={locations}
          onChange={(event) => setLocations(event.target.value)}
          placeholder="Dar es Salaam, Arusha"
        />
        <small>Separate multiple locations with commas.</small>

        <label className="text-label" htmlFor="alert-organisations">Preferred organisations</label>
        <input
          id="alert-organisations"
          value={organisations}
          onChange={(event) => setOrganisations(event.target.value)}
          placeholder="Stanbic Bank Tanzania"
        />

        <label className="text-label" htmlFor="alert-keywords">Role keywords</label>
        <input
          id="alert-keywords"
          value={keywords}
          onChange={(event) => setKeywords(event.target.value)}
          placeholder="Graphic Designer, Credit Analyst"
        />
        <small>Use role names or skills to make category alerts more precise.</small>

        <div className="missing-field">
          <label className="text-label" htmlFor="alert-missing-field">
            Can’t find your professional field?
          </label>
          <input
            id="alert-missing-field"
            value={missingField}
            onChange={(event) => setMissingField(event.target.value)}
            maxLength={80}
            placeholder="For example: Creative Design"
          />
          <small>
            Add it here. We will use it as a matching keyword and aggregate
            candidate demand when reviewing new categories.
          </small>
        </div>

        <div className="option-columns">
          <div>
            <h2>Experience level</h2>
            {EXPERIENCE_LEVELS.map((level) => (
              <label className="compact-choice" key={level}>
                <input
                  type="checkbox"
                  checked={experienceLevels.includes(level)}
                  onChange={() => toggle(level, experienceLevels, setExperienceLevels)}
                />
                <span>{level}</span>
              </label>
            ))}
          </div>
          <div>
            <h2>Work arrangement</h2>
            {WORK_ARRANGEMENTS.map((arrangement) => (
              <label className="compact-choice" key={arrangement}>
                <input
                  type="checkbox"
                  checked={workArrangements.includes(arrangement)}
                  onChange={() => toggle(arrangement, workArrangements, setWorkArrangements)}
                />
                <span>{arrangement}</span>
              </label>
            ))}
          </div>
        </div>
      </fieldset>

      <label className="consent">
        <input
          type="checkbox"
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
          required
        />
        <span>
          I agree to receive personalised Daraja job-alert emails based on these
          preferences. I can update or stop them at any time.
        </span>
      </label>

      {message && (
        <p className={`message ${status}`} role={status === "error" ? "alert" : "status"}>
          {message}
        </p>
      )}
      <div className="actions">
        <button type="submit" disabled={status === "loading" || !categories.length}>
          {status === "loading" ? "Saving..." : "Save alert preferences"}
        </button>
        {alertsActive && (
          <button className="secondary" type="button" onClick={disableAlerts}>
            Pause email alerts
          </button>
        )}
      </div>

      <style jsx>{`
        .preferences { margin-top: 2rem; }
        .saved-summary { display: flex; gap: .85rem; margin: 0 0 1.5rem; padding: 1rem 1.1rem; border: 1px solid #a6f4c5; border-radius: 10px; background: #ecfdf3; color: #065f46; }
        .saved-mark { display: grid; width: 30px; height: 30px; flex: 0 0 30px; place-items: center; border-radius: 50%; background: #087f6c; color: white; font-weight: 800; }
        .saved-summary h2 { margin: 0 0 .2rem; color: #065f46; font-size: .9rem; }
        .saved-summary p { margin: 0; font-size: .76rem; line-height: 1.55; }
        fieldset { margin: 0 0 1.5rem; padding: 1.25rem; border: 1px solid #e4e7ec; border-radius: 9px; }
        legend { padding: 0 .4rem; font-weight: 750; }
        legend span { margin-left: .35rem; color: #087f6c; font-size: .68rem; text-transform: uppercase; }
        fieldset > p { margin: 0 0 1rem; color: #667085; font-size: .8rem; line-height: 1.55; }
        .choice-grid { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: .55rem; }
        .choice-grid label, .compact-choice { display: flex; min-height: 42px; padding: .6rem .7rem; align-items: flex-start; gap: .55rem; border: 1px solid #e4e7ec; border-radius: 6px; color: #344054; font-size: .78rem; line-height: 1.4; cursor: pointer; }
        input[type="checkbox"] { width: 18px; height: 18px; flex: 0 0 auto; accent-color: #087f6c; }
        .text-label { display: block; margin: .9rem 0 .35rem; color: #344054; font-size: .78rem; font-weight: 700; }
        .text-label:first-of-type { margin-top: 0; }
        input:not([type="checkbox"]) { width: 100%; min-height: 46px; padding: 0 .8rem; border: 1.5px solid #cfd6df; border-radius: 6px; font: inherit; }
        small { display: block; margin-top: .3rem; color: #667085; font-size: .68rem; }
        .missing-field { margin-top: 1.15rem; padding: 1rem; border-radius: 8px; background: #f8fafc; }
        .missing-field .text-label { margin-top: 0; }
        .option-columns { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1.25rem; }
        h2 { margin: 0 0 .55rem; font-size: .8rem; }
        .compact-choice { min-height: 38px; margin-bottom: .4rem; }
        .consent { display: flex; gap: .65rem; color: #475467; font-size: .78rem; line-height: 1.55; }
        .message { margin: 1rem 0 0; font-size: .8rem; }
        .message.success { color: #067647; }
        .message.error { color: #b42318; }
        .actions { display: flex; gap: .75rem; margin-top: 1rem; }
        button { min-height: 46px; padding: .75rem 1rem; border: 0; border-radius: 6px; background: #00c9a7; color: #1b2a3f; font: inherit; font-size: .8rem; font-weight: 750; cursor: pointer; }
        button:disabled { opacity: .55; cursor: not-allowed; }
        button.secondary { background: #f2f4f7; color: #344054; }
        input:focus-visible, button:focus-visible { outline: 3px solid #f59e0b; outline-offset: 2px; }
        @media (max-width: 640px) {
          .choice-grid, .option-columns { grid-template-columns: 1fr; }
          .actions { flex-direction: column; }
          button { width: 100%; }
        }
      `}</style>
    </form>
  );
}
