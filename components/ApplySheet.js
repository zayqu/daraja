"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useT } from "@/components/LanguageProvider";
import styles from "./ApplySheet.module.css";

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "";
}

function Ring({ value }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const score = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <span className={styles.ring} aria-hidden="true">
      <svg viewBox="0 0 64 64" focusable="false">
        <circle cx="32" cy="32" r={radius} className={styles.ringTrack} />
        <circle
          cx="32"
          cy="32"
          r={radius}
          className={styles.ringValue}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - score / 100)}
        />
      </svg>
      <span>
        <strong>{score}</strong>/100
      </span>
    </span>
  );
}

/**
 * Apply with Daraja CV (Figma "Apply sheet"): pick which of your CVs to send,
 * see how well it fits this job, optionally add a cover letter, send. Only
 * for vacancies employers posted on Daraja. Opens by itself after sign-in
 * when the page URL has ?apply=1.
 */
export default function ApplySheet({ job, open, onClose }) {
  const t = useT();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [cvId, setCvId] = useState("");
  const [withLetter, setWithLetter] = useState(false);
  const [letter, setLetter] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const panelRef = useRef(null);

  const load = useCallback(async () => {
    setError("");
    try {
      const response = await fetch(`/api/candidate/apply?jobId=${encodeURIComponent(job.id)}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not load your CVs.");
      setData(payload);
      setCvId(payload.bestCvId || payload.cvs?.[0]?.id || "");
    } catch (loadError) {
      setError(loadError.message);
    }
  }, [job.id]);

  useEffect(() => {
    if (!open) return undefined;
    void load();
    const onKey = (event) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const previous = document.activeElement;
    panelRef.current?.focus();
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      previous?.focus?.();
    };
  }, [open, load, onClose]);

  if (!open) return null;

  async function send() {
    setSending(true);
    setError("");
    try {
      const response = await fetch("/api/candidate/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: job.id, cvId, coverLetter: withLetter ? letter : "" }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Your application was not sent.");
      setSent(true);
    } catch (sendError) {
      setError(sendError.message);
    } finally {
      setSending(false);
    }
  }

  const pricing = data?.pricing || { paid: false };
  const selected = data?.cvs?.find((cv) => cv.id === cvId) || null;
  const callback = `/jobs/${encodeURIComponent(job.slug || job.id)}?apply=1`;
  const tailorHref = `/account/career/cv?job=${encodeURIComponent(job.id)}`;
  const hasTailored = data?.cvs?.some((cv) => cv.tailoredForThisJob);

  let body;
  if (error && !data) {
    body = <p className={styles.notice} role="alert">{error}</p>;
  } else if (!data) {
    body = <p className={styles.muted}>{t("Loading your CVs…")}</p>;
  } else if (!data.signedIn) {
    body = (
      <div className={styles.center}>
        <h3>{t("Sign in to apply with your Daraja CV")}</h3>
        <p>{t("Your CV and profile go to the employer in one step, and you can follow the application in My jobs.")}</p>
        <Link className={styles.primary} href={`/auth/signin?callbackUrl=${encodeURIComponent(callback)}`}>{t("Sign in")}</Link>
        <Link className={styles.secondary} href={`/auth/signup?callbackUrl=${encodeURIComponent(callback)}`}>{t("Create a free account")}</Link>
      </div>
    );
  } else if (sent) {
    body = (
      <div className={styles.center} role="status">
        <span className={styles.doneMark} aria-hidden="true">✓</span>
        <h3>{t("Application sent")}</h3>
        <p>{t("{company} can now see your CV and profile. Follow it in My jobs.", { company: job.company })}</p>
        <Link className={styles.primary} href="/account/jobs">{t("Go to My jobs")}</Link>
      </div>
    );
  } else if (data.application) {
    body = (
      <div className={styles.center}>
        <h3>{t("You already applied")}</h3>
        <p>{t("You sent your application on {date}.", { date: formatDate(data.application.createdAt) })}</p>
        <Link className={styles.primary} href="/account/jobs">{t("Go to My jobs")}</Link>
      </div>
    );
  } else if (!data.cvs.length) {
    body = (
      <div className={styles.center}>
        <h3>{t("Make your CV first")}</h3>
        <p>{t("Build a CV from your profile in a few minutes, then come back to apply.")}</p>
        <Link className={styles.primary} href={tailorHref}>{t("Open CV Builder")}</Link>
      </div>
    );
  } else {
    body = (
      <>
        <div className={styles.score}>
          <Ring value={selected?.matchScore ?? selected?.atsScore ?? 0} />
          <div>
            <strong>
              {selected?.matchScore != null
                ? t("{n}% match", { n: selected.matchScore })
                : t("ATS readiness")}
            </strong>
            <span>{job.title} · {job.company}</span>
            {selected ? <em className={styles.badge}>ATS {selected.atsScore}/100</em> : null}
          </div>
        </div>

        {selected ? (
          <section className={styles.section}>
            <h3>{t("How this CV fits")}</h3>
            <ul className={styles.fits}>
              {selected.matchedKeywords.length ? (
                <li className={styles.fitGood}>
                  {t("Mentions {words}", { words: selected.matchedKeywords.slice(0, 4).join(", ") })}
                </li>
              ) : null}
              {selected.tailoredForThisJob ? <li className={styles.fitGood}>{t("Tailored for this job")}</li> : null}
              {selected.missingKeywords.length ? (
                <li className={styles.fitGap}>
                  {t("Not in this CV yet: {words}. Add them only if they are true for you.", {
                    words: selected.missingKeywords.slice(0, 3).join(", "),
                  })}
                </li>
              ) : null}
            </ul>
          </section>
        ) : null}

        <section className={styles.section}>
          <h3>{t("Send this CV")}</h3>
          <div className={styles.options} role="radiogroup" aria-label={t("Send this CV")}>
            {data.cvs.map((cv) => (
              <label key={cv.id} className={`${styles.option} ${cv.id === cvId ? styles.optionActive : ""}`}>
                <input type="radio" name="apply-cv" value={cv.id} checked={cv.id === cvId} onChange={() => setCvId(cv.id)} />
                <span>
                  <strong>{cv.name}</strong>
                  <small>
                    {[
                      cv.tailoredForThisJob ? t("Tailored for this job") : cv.kind === "MASTER" ? t("Master CV") : t("Tailored copy"),
                      `ATS ${cv.atsScore}`,
                      cv.matchScore != null ? t("{n}% match", { n: cv.matchScore }) : null,
                    ].filter(Boolean).join(" · ")}
                  </small>
                </span>
                {cv.id === data.bestCvId && data.cvs.length > 1 ? <em className={styles.badge}>{t("Best")}</em> : null}
              </label>
            ))}
          </div>
          {!hasTailored ? (
            pricing.paid ? (
              <p className={styles.extra}>
                {t("Tailor a copy for this job")} · TSh {pricing.tailorPrice.toLocaleString("en-GB")} · {t("payment coming soon")}
              </p>
            ) : (
              <Link className={styles.extraLink} href={tailorHref}>{t("Tailor a copy for this job (free)")} →</Link>
            )
          ) : null}
        </section>

        <section className={styles.section}>
          <label className={`${styles.option} ${withLetter ? styles.optionActive : ""} ${pricing.paid ? styles.optionDisabled : ""}`}>
            <input
              type="checkbox"
              checked={withLetter}
              disabled={pricing.paid}
              onChange={(event) => setWithLetter(event.target.checked)}
            />
            <span>
              <strong>{t("Add a cover letter")}</strong>
              <small>
                {pricing.paid
                  ? `${t("Written for this job")} · TSh ${pricing.coverLetterPrice.toLocaleString("en-GB")} · ${t("payment coming soon")}`
                  : t("Written by you for this job · Free")}
              </small>
            </span>
          </label>
          {withLetter ? (
            <textarea
              className={styles.letter}
              rows={7}
              maxLength={10000}
              value={letter}
              onChange={(event) => setLetter(event.target.value)}
              placeholder={t("Dear hiring team, …")}
              aria-label={t("Cover letter")}
            />
          ) : null}
        </section>

        {error ? <p className={styles.notice} role="alert">{error}</p> : null}

        <button type="button" className={styles.send} onClick={send} disabled={sending || !cvId || (withLetter && letter.trim().length < 40)}>
          {sending ? t("Sending…") : t("Send application")}
        </button>
        <p className={styles.fine}>
          {t("The employer sees your CV and profile. You can withdraw any time in My jobs.")}
        </p>
      </>
    );
  }

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <aside
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby="apply-sheet-title"
        tabIndex={-1}
        ref={panelRef}
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles.head}>
          <h2 id="apply-sheet-title">{t("Apply with Daraja CV")}</h2>
          <button type="button" className={styles.close} onClick={onClose} aria-label={t("Close")}>×</button>
        </header>
        <div className={styles.body}>{body}</div>
      </aside>
    </div>
  );
}
