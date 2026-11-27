"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/DashboardUi";
import NavIcon from "@/components/ui/NavIcon";
import dash from "@/components/dashboard/dashboard.module.css";
import { JOB_CATEGORIES } from "@/lib/job-categories";
import styles from "./EmployerVacancyForm.module.css";

const JOB_TYPES = [
  ["FULL_TIME", "Full time"],
  ["PART_TIME", "Part time"],
  ["CONTRACT", "Contract"],
  ["INTERNSHIP", "Internship"],
  ["FREELANCE", "Freelance"],
];
const EXPERIENCE = [
  ["", "Not stated"],
  ["0", "No experience needed"],
  ["1", "1+ years"],
  ["2", "2+ years"],
  ["3", "3+ years"],
  ["5", "5+ years"],
  ["8", "8+ years"],
  ["10", "10+ years"],
];
const EMPTY_FORM = {
  title: "",
  location: "",
  category: "",
  type: "FULL_TIME",
  experience: "",
  showSalary: false,
  salaryMin: "",
  salaryMax: "",
  deadline: "",
  description: "",
  openings: "",
  applyMethod: "email",
  applyEmail: "",
  applyUrl: "",
};
const STEPS = [
  { key: "basics", label: "Basics" },
  { key: "details", label: "Details" },
  { key: "apply", label: "How to apply" },
  { key: "review", label: "Review" },
];

function todayInTanzania() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Dar_es_Salaam" }).format(new Date());
}

function daysLeft(deadline) {
  if (!deadline) return null;
  const days = Math.round((new Date(`${deadline}T00:00:00Z`) - new Date(`${todayInTanzania()}T00:00:00Z`)) / 86_400_000);
  if (days < 0) return null;
  return days === 0 ? "Closes today" : `${days} ${days === 1 ? "day" : "days"} left`;
}

function shortTsh(value) {
  const number = Number(String(value || "").replace(/[^\d]/g, ""));
  if (!number) return "";
  if (number >= 1_000_000) return `${(number / 1_000_000).toFixed(number % 1_000_000 ? 1 : 0)}M`;
  if (number >= 1_000) return `${Math.round(number / 1_000)}K`;
  return String(number);
}

function salaryPreview(form) {
  if (!form.showSalary || !form.salaryMin) return null;
  const min = shortTsh(form.salaryMin);
  const max = shortTsh(form.salaryMax);
  return max && max !== min ? `TSh ${min} – ${max}` : `TSh ${min}`;
}

function initials(name) {
  const words = String(name || "?").trim().split(/\s+/).filter(Boolean);
  return ((words[0]?.[0] || "?") + (words[1]?.[0] || "")).toUpperCase();
}

// Only the chosen application method is sent, so the server never receives
// both an email and a link for one vacancy.
function submissionBody(form) {
  const { applyMethod, applyEmail, applyUrl, ...rest } = form;
  return applyMethod === "email"
    ? { ...rest, applyEmail: applyEmail.trim(), emailSubject: `Application for ${form.title.trim()}` }
    : { ...rest, applyUrl: applyUrl.trim() };
}

function Field({ id, label, hint, children, wide = false }) {
  return (
    <div className={`${styles.field} ${wide ? styles.wide : ""}`}>
      <label htmlFor={id}>{label}</label>
      {children}
      {hint ? <small>{hint}</small> : null}
    </div>
  );
}

/**
 * Post a job (Figma Desktop · Post a job): four steps with a live preview of
 * the job card. Creates a vacancy, or edits one when `vacancyId` is given.
 * "Save draft" keeps it private; sending it goes to Daraja's review, or live
 * straight away for trusted employers (`publishesNow`; the server decides).
 */
export default function EmployerVacancyForm({
  companyName,
  categories = JOB_CATEGORIES,
  vacancyId = null,
  initialValues = null,
  publishesNow = false,
  title = "Post a job",
  description = null,
  notices = null,
  featurePrice = null,
  featureDays = 14,
}) {
  const [savedId, setSavedId] = useState(vacancyId);
  const editing = Boolean(savedId);
  const [form, setForm] = useState(initialValues ? { ...EMPTY_FORM, ...initialValues } : EMPTY_FORM);
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(null);
  const [feature, setFeature] = useState(false);
  const stepRef = useRef(null);
  const busy = status === "loading";

  function update(field) {
    return (event) => {
      const value = event.target.type === "checkbox" ? event.target.checked : event.target.value;
      setForm((current) => ({ ...current, [field]: value }));
    };
  }

  // Each step checks its own fields before moving on.
  function stepIsValid() {
    const fields = stepRef.current?.querySelectorAll("input, select, textarea") || [];
    for (const field of fields) {
      if (!field.checkValidity()) {
        field.reportValidity();
        return false;
      }
    }
    return true;
  }

  function goTo(next) {
    if (next > step && !stepIsValid()) return;
    setMessage("");
    setStep(Math.max(0, Math.min(STEPS.length - 1, next)));
  }

  async function send({ draft }) {
    setStatus("loading");
    setMessage("");
    try {
      const body = submissionBody(form);
      const response = await fetch(editing ? `/api/employer/jobs/${savedId}` : "/api/employer/jobs", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing ? { ...body, submit: !draft } : { ...body, draft }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to save the vacancy");
      if (payload.job?.id) setSavedId(payload.job.id);
      setStatus("idle");
      if (draft) {
        setMessage("Draft saved. Only you can see it, under My vacancies.");
        return;
      }
      setDone({
        live: payload.job?.moderationStatus === "PUBLISHED",
        slug: payload.job?.slug || payload.job?.id,
        title: form.title.trim(),
      });
    } catch (error) {
      setStatus("error");
      setMessage(error.message || "Unable to save the vacancy. Please try again.");
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (step < STEPS.length - 1) {
      goTo(step + 1);
      return;
    }
    void send({ draft: false });
  }

  const header = (
    <PageHeader
      title={title}
      description={
        description ||
        (publishesNow
          ? "Your vacancies go live as soon as you send them."
          : "Daraja checks each vacancy before it goes live.")
      }
      actions={
        done ? null : (
          <>
            <Link className={dash.button} href="/employer/vacancies">My vacancies</Link>
            <button type="button" className={dash.button} onClick={() => send({ draft: true })} disabled={busy || !form.title.trim()}>
              {busy ? "Saving…" : "Save draft"}
            </button>
          </>
        )
      }
    />
  );

  if (done) {
    return (
      <>
        {header}
        <section className={styles.doneCard} aria-live="polite">
          <span className={styles.doneIcon} aria-hidden="true"><NavIcon name="privacy" size={28} /></span>
          <h2>{done.live ? "Your vacancy is live" : "Vacancy sent for review"}</h2>
          <p>
            {done.live
              ? `"${done.title}" is now on Daraja Ajira.`
              : `Daraja will check "${done.title}" before it goes live. You can follow it under My vacancies.`}
          </p>
          <div className={styles.doneActions}>
            {done.live && done.slug ? <Link className={dash.button} href={`/jobs/${done.slug}`}>View the job</Link> : null}
            <Link className={dash.button} href="/employer/vacancies">My vacancies</Link>
            <a className={dash.buttonPrimary} href="/post-job">Post another job</a>
          </div>
          {feature ? (
            <div className={styles.doneFeature}>
              <strong>Next: feature this vacancy</strong>
              <p>Book the featured slot and pay to put it at the top of Ajira and on the DARAJA WhatsApp Channel.</p>
              <Link className={dash.buttonPrimary} href={`/advertise?vacancy=${encodeURIComponent(done.title)}`}>
                Book the featured slot
              </Link>
            </div>
          ) : null}
        </section>
      </>
    );
  }

  const preview = {
    title: form.title.trim() || "Job title",
    place: [form.location.trim(), JOB_TYPES.find(([value]) => value === form.type)?.[1]].filter(Boolean),
    salary: salaryPreview(form),
    left: daysLeft(form.deadline),
  };
  const submitLabel = busy
    ? "Sending…"
    : vacancyId
      ? "Save and send for review"
      : publishesNow
        ? "Publish vacancy"
        : "Submit for review";

  return (
    <>
      {header}
      {notices}

      <div className={styles.layout}>
        <form className={styles.card} onSubmit={handleSubmit} noValidate={false}>
          <nav className={styles.steps} aria-label="Steps">
            {STEPS.map((item, index) => (
              <button
                type="button"
                key={item.key}
                className={index === step ? styles.stepActive : index < step ? styles.stepDone : ""}
                aria-current={index === step ? "step" : undefined}
                onClick={() => goTo(index)}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className={styles.body} ref={stepRef}>
            {step === 0 ? (
              <>
                <h2>Job basics</h2>
                <div className={styles.grid}>
                  <Field id="vacancy-title" label="Job title" wide>
                    <input id="vacancy-title" maxLength={160} required value={form.title} onChange={update("title")} placeholder="e.g. Accountant" />
                  </Field>
                  <Field id="vacancy-category" label="Category">
                    <select id="vacancy-category" required value={form.category} onChange={update("category")}>
                      <option value="">Select a category</option>
                      {categories.map((category) => <option key={category} value={category}>{category}</option>)}
                    </select>
                  </Field>
                  <Field id="vacancy-type" label="Job type">
                    <select id="vacancy-type" value={form.type} onChange={update("type")}>
                      {JOB_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </Field>
                  <Field id="vacancy-location" label="Location">
                    <span className={styles.withIcon}>
                      <NavIcon name="location" size={18} />
                      <input id="vacancy-location" maxLength={160} required value={form.location} onChange={update("location")} placeholder="Dar es Salaam" />
                    </span>
                  </Field>
                  <Field id="vacancy-experience" label="Experience">
                    <select id="vacancy-experience" value={form.experience} onChange={update("experience")}>
                      {EXPERIENCE.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </Field>
                  <div className={`${styles.field} ${styles.wide}`}>
                    <div className={styles.labelRow}>
                      <label htmlFor="vacancy-salary-min">Salary per month (TSh)</label>
                      <label className={styles.switch}>
                        <input type="checkbox" checked={form.showSalary} onChange={update("showSalary")} />
                        <span aria-hidden="true" />
                        Show on the job
                      </label>
                    </div>
                    <div className={styles.range}>
                      <input
                        id="vacancy-salary-min"
                        inputMode="numeric"
                        pattern="[0-9, ]*"
                        maxLength={13}
                        required={form.showSalary}
                        disabled={!form.showSalary}
                        value={form.salaryMin}
                        onChange={update("salaryMin")}
                        placeholder="1,800,000"
                        aria-label="Lowest monthly salary"
                      />
                      <span>to</span>
                      <input
                        inputMode="numeric"
                        pattern="[0-9, ]*"
                        maxLength={13}
                        disabled={!form.showSalary}
                        value={form.salaryMax}
                        onChange={update("salaryMax")}
                        placeholder="2,400,000"
                        aria-label="Highest monthly salary (optional)"
                      />
                    </div>
                  </div>
                  <Field id="vacancy-deadline" label="Closing date" hint="Applications close at the end of this day (Tanzania time).">
                    <input id="vacancy-deadline" type="date" required min={todayInTanzania()} value={form.deadline} onChange={update("deadline")} />
                  </Field>
                </div>
                <p className={styles.tip}>
                  <NavIcon name="info" size={18} />
                  Jobs that show the salary usually get more applications.
                </p>
              </>
            ) : null}

            {step === 1 ? (
              <>
                <h2>Job details</h2>
                <div className={styles.grid}>
                  <Field
                    id="vacancy-description"
                    label="Job description"
                    hint="Include what the job involves, the requirements and anything candidates must send."
                    wide
                  >
                    <textarea
                      id="vacancy-description"
                      maxLength={10000}
                      minLength={80}
                      required
                      rows={12}
                      value={form.description}
                      onChange={update("description")}
                      placeholder={"About the role\nResponsibilities\n- ...\nRequirements\n- ..."}
                    />
                  </Field>
                  <Field id="vacancy-openings" label="Number of openings" hint="Leave empty for one opening.">
                    <input id="vacancy-openings" type="number" min={1} max={500} value={form.openings} onChange={update("openings")} placeholder="1" />
                  </Field>
                  <Field id="vacancy-company" label="Employer" hint="Taken from your company profile.">
                    <input id="vacancy-company" value={companyName} readOnly aria-readonly="true" />
                  </Field>
                </div>
              </>
            ) : null}

            {step === 2 ? (
              <>
                <h2>How candidates apply</h2>
                <fieldset className={styles.choices}>
                  <legend className="sr-only">Application method</legend>
                  {[
                    ["email", "By email", "The Apply button opens an email to you.", "mail"],
                    ["link", "On our website", "The Apply button opens your own application page.", "sources"],
                  ].map(([value, label, text, icon]) => (
                    <label key={value} className={`${styles.choice} ${form.applyMethod === value ? styles.choiceActive : ""}`}>
                      <input type="radio" name="vacancy-apply-method" value={value} checked={form.applyMethod === value} onChange={update("applyMethod")} />
                      <NavIcon name={icon} size={22} />
                      <span>
                        <strong>{label}</strong>
                        <small>{text}</small>
                      </span>
                    </label>
                  ))}
                </fieldset>
                {form.applyMethod === "email" ? (
                  <Field id="vacancy-apply-email" label="Application email">
                    <input id="vacancy-apply-email" type="email" maxLength={200} required value={form.applyEmail} onChange={update("applyEmail")} placeholder="careers@company.co.tz" />
                  </Field>
                ) : (
                  <Field id="vacancy-apply-url" label="Application page link" hint="Must start with https://">
                    <input id="vacancy-apply-url" type="url" maxLength={2000} required pattern="https://.*" value={form.applyUrl} onChange={update("applyUrl")} placeholder="https://company.co.tz/careers/position" />
                  </Field>
                )}
              </>
            ) : null}

            {step === 3 ? (
              <>
                <h2>Review and send</h2>
                <dl className={styles.summary}>
                  {[
                    ["Job title", form.title, 0],
                    ["Category", form.category, 0],
                    ["Job type", JOB_TYPES.find(([value]) => value === form.type)?.[1], 0],
                    ["Location", form.location, 0],
                    ["Experience", EXPERIENCE.find(([value]) => value === form.experience)?.[1], 0],
                    ["Salary", form.showSalary ? salaryPreview(form) : "Not shown", 0],
                    ["Closing date", form.deadline, 0],
                    ["Openings", form.openings || "1", 1],
                    ["Description", form.description ? `${form.description.trim().split(/\s+/).length} words` : "", 1],
                    ["Apply", form.applyMethod === "email" ? form.applyEmail : form.applyUrl, 2],
                  ].map(([label, value, target]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{value || <em>Missing</em>}</dd>
                      <button type="button" onClick={() => setStep(target)} aria-label={`Edit ${label.toLowerCase()}`}>Edit</button>
                    </div>
                  ))}
                </dl>
                <p className={styles.note}>
                  {publishesNow && !vacancyId
                    ? "Your company is verified with instant publishing, so this vacancy goes live as soon as you send it."
                    : "Daraja checks the job, the closing date and how to apply before it goes live."}
                </p>
              </>
            ) : null}
          </div>

          {message ? (
            <p className={`${styles.message} ${status === "error" ? styles.messageError : ""}`} role={status === "error" ? "alert" : "status"}>
              {message}
            </p>
          ) : null}

          <footer className={styles.footer}>
            <Link className={styles.cancel} href="/employer/vacancies">Cancel</Link>
            <span className={styles.footerActions}>
              {step > 0 ? (
                <button type="button" className={dash.button} onClick={() => goTo(step - 1)}>Back</button>
              ) : null}
              <button type="submit" className={dash.buttonPrimary} disabled={busy}>
                {step < STEPS.length - 1 ? `Next: ${STEPS[step + 1].label}` : submitLabel}
              </button>
            </span>
          </footer>
        </form>

        <aside className={styles.side} aria-label="Preview">
          <p className={styles.sideLabel}>Preview</p>
          <article className={styles.preview}>
            <span className={styles.previewMark} aria-hidden="true">{initials(companyName)}</span>
            <h3>{preview.title}</h3>
            <p>{companyName}</p>
            {preview.place.length ? (
              <ul>
                {preview.place.map((item) => <li key={item}>{item}</li>)}
              </ul>
            ) : null}
            <div className={styles.previewFoot}>
              <strong>{preview.salary || "Salary not stated"}</strong>
              {preview.left ? <span>{preview.left}</span> : null}
            </div>
          </article>

          {featurePrice && !vacancyId ? (
            <section className={styles.feature}>
              <span className={styles.featurePrice}>TSh {featurePrice}</span>
              <strong>Feature this vacancy</strong>
              <p>Top of Ajira and the DARAJA WhatsApp Channel for {featureDays} days.</p>
              <label className={styles.featureCheck}>
                <input type="checkbox" checked={feature} onChange={(event) => setFeature(event.target.checked)} />
                Add when I publish
              </label>
            </section>
          ) : null}
        </aside>
      </div>
    </>
  );
}
