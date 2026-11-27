"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import CvPreview from "@/components/CvPreview";
import { PageHeader } from "@/components/dashboard/DashboardUi";
import NavIcon from "@/components/ui/NavIcon";
import { useT } from "@/components/LanguageProvider";
import dash from "@/components/dashboard/dashboard.module.css";
import styles from "./CvBuilder.module.css";

const EMPTY_ITEM = {
  experience: {
    role: "",
    employer: "",
    location: "",
    startDate: "",
    endDate: "",
    current: false,
    bullets: [],
  },
  education: {
    qualification: "",
    institution: "",
    location: "",
    startYear: "",
    endYear: "",
    details: "",
  },
  certifications: { name: "", issuer: "", year: "" },
  trainings: { name: "", provider: "", year: "" },
  projects: { name: "", description: "", link: "" },
  languages: { name: "", level: "" },
  references: {
    name: "",
    title: "",
    organisation: "",
    phone: "",
    email: "",
  },
};

const SECTION_NAMES = {
  summary: "Summary",
  experience: "Experience",
  education: "Education",
  skills: "Skills",
  certifications: "Certifications",
  trainings: "Training",
  projects: "Projects",
  languages: "Languages",
  references: "Referees",
};

const DESIGN_POOLS = {
  general: {
    templates: ["modern", "classic", "minimal", "executive"],
    accents: ["#1b2a3f", "#0f766e", "#31511e", "#4338ca", "#7c2d12", "#374151"],
    fonts: ["Arial", "Georgia", "Times New Roman", "Trebuchet MS", "Verdana", "Tahoma"],
  },
  finance: {
    templates: ["executive", "modern", "classic"],
    accents: ["#1b2a3f", "#243447", "#3f3f46", "#4a1d2f"],
    fonts: ["Arial", "Georgia", "Tahoma"],
  },
  tech: {
    templates: ["modern", "minimal", "executive"],
    accents: ["#1b2a3f", "#0f766e", "#334155", "#4338ca"],
    fonts: ["Arial", "Trebuchet MS", "Verdana", "Tahoma"],
  },
  social: {
    templates: ["modern", "classic", "minimal"],
    accents: ["#1b2a3f", "#166534", "#0f766e", "#7c2d12"],
    fonts: ["Arial", "Georgia", "Trebuchet MS"],
  },
  public: {
    templates: ["public", "classic"],
    accents: ["#1b2a3f", "#263238", "#374151"],
    fonts: ["Times New Roman", "Georgia", "Arial"],
  },
};

const randomFrom = (items) => items[Math.floor(Math.random() * items.length)];

function designPool(mode, job) {
  if (mode === "PUBLIC_SERVICE") return DESIGN_POOLS.public;
  const text = [job?.category, job?.title, job?.company].filter(Boolean).join(" ").toLowerCase();
  if (/bank|finance|account|audit|insurance|investment/.test(text)) return DESIGN_POOLS.finance;
  if (/technology|software|developer|data|engineer|digital|ict|it\b/.test(text)) return DESIGN_POOLS.tech;
  if (/ngo|health|development|social|community|education/.test(text)) return DESIGN_POOLS.social;
  return DESIGN_POOLS.general;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function Field({ label, value, onChange, type = "text", placeholder = "", ...props }) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      <input
        type={type}
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        {...props}
      />
    </label>
  );
}

function TextArea({ label, value, onChange, placeholder = "", rows = 4 }) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      <textarea
        rows={rows}
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}


// Figma Desktop · CV Builder: the editor is split into steps so a long CV
// never feels like one endless form. Facts stay the candidate's own (D-029).
const STEPS = [
  { key: "details", label: "Details" },
  { key: "summary", label: "Summary" },
  { key: "experience", label: "Experience" },
  { key: "education", label: "Education" },
  { key: "skills", label: "Skills" },
  { key: "more", label: "More" },
  { key: "design", label: "Design" },
];

const MORE_SECTIONS = [
  ["certifications", "Certifications", ["name", "issuer", "year"]],
  ["trainings", "Training", ["name", "provider", "year"]],
  ["languages", "Languages", ["name", "level"]],
  ["references", "Referees", ["name", "title", "organisation", "phone", "email"]],
  ["projects", "Projects", ["name", "description", "link"]],
];

const FIELD_LABELS = {
  name: "Name",
  issuer: "Issuer",
  year: "Year",
  provider: "Provider",
  level: "Level",
  title: "Title",
  organisation: "Organisation",
  phone: "Phone",
  email: "Email",
  description: "Description",
  link: "Link",
};

const TEMPLATE_LABELS = {
  modern: "Modern",
  classic: "Classic",
  minimal: "Minimal",
  executive: "Executive",
  public: "Public Service",
};

function initials(value) {
  const parts = String(value || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length > 1) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return (parts[0] || "·").slice(0, 2).toUpperCase();
}

// A plain checklist of the basics the ATS score rewards most.
function readinessChecks(cv) {
  const content = cv.content;
  const personal = content.personal || {};
  return [
    { label: "Contact details", done: Boolean(personal.fullName && personal.phone && personal.email) },
    { label: "Professional summary", done: (content.summary || "").length >= 60 },
    { label: "Work experience with results", done: content.experience.some((item) => item.role && (item.bullets || []).length >= 2) },
    { label: "Education", done: content.education.some((item) => item.qualification && item.institution) },
    { label: "6 or more skills", done: (content.skills || []).length >= 6 },
    ...(cv.mode === "PUBLIC_SERVICE"
      ? [{ label: "Three referees", done: content.references.length >= 3 }]
      : []),
  ];
}

function ScoreRing({ score }) {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const value = Math.max(0, Math.min(100, Number(score) || 0));
  const tone = value >= 90 ? styles.ringGood : value >= 70 ? styles.ringOk : styles.ringLow;
  return (
    <div className={`${styles.ring} ${tone}`}>
      <svg viewBox="0 0 80 80" aria-hidden="true" focusable="false">
        <circle cx="40" cy="40" r={radius} className={styles.ringTrack} />
        <circle
          cx="40"
          cy="40"
          r={radius}
          className={styles.ringValue}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - value / 100)}
        />
      </svg>
      <span><strong>{value}</strong>/100</span>
    </div>
  );
}

function StepHead({ title, text }) {
  return (
    <div className={styles.stepHead}>
      <h2>{title}</h2>
      {text ? <p>{text}</p> : null}
    </div>
  );
}

function SkillsInput({ skills, onChange, t }) {
  const [draft, setDraft] = useState("");
  const add = (value) => {
    const next = value.split(",").map((skill) => skill.trim()).filter(Boolean);
    if (!next.length) return;
    const seen = new Set(skills.map((skill) => skill.toLowerCase()));
    onChange([...skills, ...next.filter((skill) => !seen.has(skill.toLowerCase()))]);
    setDraft("");
  };
  return (
    <div className={styles.skills}>
      <ul className={styles.skillChips}>
        {skills.map((skill) => (
          <li key={skill}>
            {skill}
            <button type="button" aria-label={t("Remove {skill}", { skill })} onClick={() => onChange(skills.filter((item) => item !== skill))}>
              ×
            </button>
          </li>
        ))}
      </ul>
      <div className={styles.skillAdd}>
        <label className={styles.field}>
          <span>{t("Add a skill")}</span>
          <input
            value={draft}
            onChange={(event) => (event.target.value.endsWith(",") ? add(event.target.value) : setDraft(event.target.value))}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                add(draft);
              }
            }}
            placeholder={t("e.g. Financial analysis")}
          />
        </label>
        <button type="button" className={styles.addButton} onClick={() => add(draft)}>{t("Add")}</button>
      </div>
      <p className={styles.hint}>{t("{n} skills", { n: skills.length })}</p>
    </div>
  );
}

export default function CvBuilder() {
  const t = useT();
  const searchParams = useSearchParams();
  const requestedJob = searchParams.get("job") || "";
  const [cvs, setCvs] = useState([]);
  const [activeId, setActiveId] = useState("");
  const [cv, setCv] = useState(null);
  const [job, setJob] = useState(null);
  const [evaluation, setEvaluation] = useState(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [step, setStep] = useState("details");

  const loadList = useCallback(async () => {
    const response = await fetch("/api/candidate/cv", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Unable to load CVs.");
    setCvs(data.cvs || []);
    setActiveId((current) => current || data.cvs?.[0]?.id || "");
  }, []);

  useEffect(() => {
    loadList().catch((error) => setStatus(error.message));
  }, [loadList]);

  useEffect(() => {
    if (!activeId) {
      setCv(null);
      setJob(null);
      setEvaluation(null);
      return;
    }
    let active = true;
    fetch(`/api/candidate/cv/${encodeURIComponent(activeId)}`, { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to load CV.");
        if (active) {
          setCv(data.cv);
          setJob(data.job || null);
          setEvaluation(data.evaluation || null);
        }
      })
      .catch((error) => active && setStatus(error.message));
    return () => {
      active = false;
    };
  }, [activeId]);

  const generateDesign = useCallback(() => {
    setCv((current) => {
      if (!current) return current;
      const pool = designPool(current.mode, job);
      return {
        ...current,
        theme: {
          ...current.theme,
          template: randomFrom(pool.templates),
          accent: randomFrom(pool.accents),
          fontFamily: randomFrom(pool.fonts),
          density: randomFrom(["compact", "comfortable", "spacious"]),
          headerAlign: randomFrom(["left", "center"]),
          headerStyle: randomFrom(["clean", "rule", "accent"]),
          headingStyle: randomFrom(["line", "plain", "caps", "accent"]),
          bulletStyle: randomFrom(["disc", "square", "dash"]),
          contactStyle: randomFrom(["dots", "pipes", "lines"]),
          nameScale: randomFrom(["compact", "balanced", "prominent"]),
          pageMargin: randomFrom(["narrow", "standard", "wide"]),
        },
      };
    });
  }, [job]);

  const updateContent = useCallback((updater) => {
    setCv((current) => {
      if (!current) return current;
      const next = clone(current);
      next.content = typeof updater === "function" ? updater(next.content) : updater;
      return next;
    });
  }, []);

  const updatePersonal = (key, value) =>
    updateContent((content) => ({
      ...content,
      personal: { ...content.personal, [key]: value },
    }));

  const updateItem = (section, index, patch) =>
    updateContent((content) => ({
      ...content,
      [section]: content[section].map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item
      ),
    }));

  const addItem = (section) =>
    updateContent((content) => ({
      ...content,
      [section]: [...(content[section] || []), clone(EMPTY_ITEM[section])],
    }));

  const removeItem = (section, index) =>
    updateContent((content) => ({
      ...content,
      [section]: content[section].filter((_, itemIndex) => itemIndex !== index),
    }));

  async function createCv(sourceCvId = "") {
    setBusy(true);
    setStatus("");
    try {
      const response = await fetch("/api/candidate/cv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceCvId: sourceCvId || undefined,
          targetJobId: requestedJob || undefined,
          name: requestedJob && sourceCvId
            ? undefined
            : sourceCvId
              ? `${cv?.name || "CV"} copy`
              : "Master CV",
          mode: cv?.mode || "GENERAL",
          language: cv?.language || "en",
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to create CV.");
      await loadList();
      setActiveId(data.cv.id);
      setStatus(sourceCvId ? "Tailored copy created." : "CV created.");
    } catch (error) {
      setStatus(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function persistCv({ notify = true } = {}) {
    if (!cv) return null;
    const response = await fetch(`/api/candidate/cv/${encodeURIComponent(cv.id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: cv.name,
        mode: cv.mode,
        targetRole: cv.targetRole,
        targetJobId: cv.targetJobId,
        language: cv.language,
        content: cv.content,
        theme: cv.theme,
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Unable to save CV.");
    setCv(data.cv);
    setJob(data.job || null);
    setEvaluation(data.evaluation || null);
    if (notify) setStatus("Saved.");
    await loadList();
    return data.cv;
  }

  async function saveCv() {
    if (!cv) return;
    setBusy(true);
    setStatus("");
    try {
      await persistCv();
    } catch (error) {
      setStatus(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function deleteCv() {
    if (!cv || !window.confirm(`Delete "${cv.name}"? This cannot be undone.`)) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/candidate/cv/${encodeURIComponent(cv.id)}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to delete CV.");
      setActiveId("");
      setCv(null);
      await loadList();
    } catch (error) {
      setStatus(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function downloadPdf() {
    if (!cv || pdfBusy) return;
    setPdfBusy(true);
    setStatus("Preparing your PDF…");

    try {
      const savedCv = await persistCv({ notify: false });
      const response = await fetch(
        `/api/candidate/cv/${encodeURIComponent(savedCv.id)}/pdf`,
        { cache: "no-store" }
      );

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Unable to generate PDF.");
      }

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/pdf")) {
        throw new Error("Daraja did not receive a valid PDF response.");
      }

      const blob = await response.blob();
      const signature = await blob.slice(0, 5).text();
      if (signature !== "%PDF-") {
        throw new Error("The generated file is not a valid PDF.");
      }

      const disposition = response.headers.get("content-disposition") || "";
      const encodedName = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
      const plainName = disposition.match(/filename="([^"]+)"/i)?.[1];
      const filename = encodedName
        ? decodeURIComponent(encodedName)
        : plainName || "Daraja-CV.pdf";

      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = filename;
      link.rel = "noopener";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);

      setStatus("PDF generated successfully. Your download has started.");
    } catch (error) {
      setStatus(error.message || "Unable to generate PDF.");
    } finally {
      setPdfBusy(false);
    }
  }

  const steps = STEPS.map((item) => item.key);
  const stepIndex = Math.max(0, steps.indexOf(step));
  const goTo = (offset) => setStep(steps[Math.min(steps.length - 1, Math.max(0, stepIndex + offset))]);

  if (!cvs.length && !activeId) {
    return (
      <>
        <PageHeader title={t("CV Builder")} description={t("Build one Master CV from your own facts, then tailor a copy for each job.")} />
        <section className={styles.empty}>
          <span>{t("Daraja CV Builder")}</span>
          <h2>{t("Build your first ATS-ready CV.")}</h2>
          <p>
            {t("Start from your private Daraja profile, then shape it for private-sector, NGO, bank or Tanzania public-service applications.")}
          </p>
          <button type="button" className={dash.buttonPrimary} onClick={() => createCv()} disabled={busy}>
            {busy ? t("Creating…") : t("Create my Master CV")}
          </button>
          {status ? <p className={styles.status}>{status}</p> : null}
        </section>
      </>
    );
  }

  if (!cv) return <p className={styles.status}>{t("Loading CV builder…")}</p>;

  const personal = cv.content.personal || {};
  const score = evaluation?.score ?? cv.atsScore ?? 0;
  const checks = readinessChecks(cv);
  const setTheme = (patch) => setCv({ ...cv, theme: { ...cv.theme, ...patch } });
  const templateChips = cv.mode === "PUBLIC_SERVICE"
    ? ["public", "classic", "modern", "minimal"]
    : ["modern", "classic", "minimal", "executive"];

  const repeatSection = (section, label, fields) => (
    <div className={styles.stack}>
      {cv.content[section].map((item, index) => (
        <details className={styles.itemCard} key={index} open={!item[fields[0]]}>
          <summary>
            <span>
              <strong>{item[fields[0]] || t("New entry")}</strong>
              <small>{fields.slice(1, 3).map((field) => item[field]).filter(Boolean).join(" · ")}</small>
            </span>
          </summary>
          <div className={styles.itemBody}>
            {fields.map((field) =>
              field === "description" ? (
                <TextArea key={field} label={t(FIELD_LABELS[field] || field)} value={item[field]} onChange={(value) => updateItem(section, index, { [field]: value })} rows={3} />
              ) : (
                <Field key={field} label={t(FIELD_LABELS[field] || field)} value={item[field]} onChange={(value) => updateItem(section, index, { [field]: value })} />
              )
            )}
            <button type="button" className={styles.removeButton} onClick={() => removeItem(section, index)}>{t("Remove")}</button>
          </div>
        </details>
      ))}
      <button type="button" className={styles.addButton} onClick={() => addItem(section)}>+ {t(`Add ${label.toLowerCase()}`)}</button>
    </div>
  );

  return (
    <div className={styles.builder}>
      <PageHeader
        title={t("CV Builder")}
        description={t("Your facts, your words. Tailor a copy for each job and keep the Master CV as your base.")}
        actions={
          <>
            <button type="button" className={dash.button} onClick={downloadPdf} disabled={busy || pdfBusy}>
              <NavIcon name="download" size={16} />
              {pdfBusy ? t("Generating PDF…") : t("Download PDF")}
            </button>
            <button type="button" className={dash.buttonPrimary} onClick={saveCv} disabled={busy || pdfBusy}>
              {busy ? t("Saving…") : t("Save CV")}
            </button>
          </>
        }
      />

      <div className={styles.versions} role="tablist" aria-label={t("Your CVs")}>
        {cvs.map((item) => (
          <button
            type="button"
            role="tab"
            aria-selected={item.id === activeId}
            key={item.id}
            className={`${styles.version} ${item.id === activeId ? styles.versionActive : ""}`}
            onClick={() => setActiveId(item.id)}
          >
            <span>{item.name}</span>
            <b className={item.atsScore >= 70 ? styles.scoreGood : styles.scoreLow}>{item.atsScore}</b>
          </button>
        ))}
        <button type="button" className={styles.versionNew} onClick={() => createCv()} disabled={busy}>
          + {t("New CV")}
        </button>
        <span className={styles.versionTools}>
          <button type="button" onClick={() => createCv(cv.id)} disabled={busy}>
            {requestedJob ? t("Tailor this CV to selected job") : t("Duplicate for another job")}
          </button>
          <button type="button" className={styles.deleteLink} onClick={deleteCv} disabled={busy}>
            {t("Delete")}
          </button>
        </span>
      </div>

      <div className={styles.columns}>
        <section className={styles.editor} aria-label={t("CV editor")}>
          <nav className={styles.steps} aria-label={t("CV sections")}>
            {STEPS.map((item) => (
              <button
                type="button"
                key={item.key}
                className={item.key === step ? styles.stepActive : ""}
                aria-current={item.key === step ? "step" : undefined}
                onClick={() => setStep(item.key)}
              >
                {t(item.label)}
              </button>
            ))}
          </nav>

          <div className={styles.stepBody}>
            {step === "details" ? (
              <>
                <StepHead title={t("Personal details")} text={t("How employers reach you. Only add what is true and current.")} />
                <div className={styles.grid2}>
                  <Field label={t("Full name")} value={personal.fullName} onChange={(value) => updatePersonal("fullName", value)} />
                  <Field label={t("Professional headline")} value={personal.headline} onChange={(value) => updatePersonal("headline", value)} placeholder={t("e.g. Accountant")} />
                  <Field label={t("Phone")} value={personal.phone} onChange={(value) => updatePersonal("phone", value)} placeholder="+255..." />
                  <Field label={t("Email")} type="email" value={personal.email} onChange={(value) => updatePersonal("email", value)} />
                  <Field label={t("Location")} value={personal.location} onChange={(value) => updatePersonal("location", value)} placeholder="Dar es Salaam" />
                  {cv.mode === "PUBLIC_SERVICE" ? (
                    <Field label={t("Postal address / postcode")} value={personal.postalAddress} onChange={(value) => updatePersonal("postalAddress", value)} />
                  ) : null}
                  <Field label="LinkedIn" value={personal.linkedIn} onChange={(value) => updatePersonal("linkedIn", value)} />
                  <Field label={t("Portfolio")} value={personal.portfolio} onChange={(value) => updatePersonal("portfolio", value)} />
                </div>
                <h3 className={styles.subHead}>{t("CV setup")}</h3>
                <div className={styles.grid2}>
                  <Field label={t("CV name")} value={cv.name} onChange={(value) => setCv({ ...cv, name: value })} />
                  <Field label={t("Target role")} value={cv.targetRole} onChange={(value) => setCv({ ...cv, targetRole: value })} placeholder={t("e.g. Relationship Manager")} />
                  <label className={styles.field}>
                    <span>{t("Application mode")}</span>
                    <select value={cv.mode} onChange={(event) => setCv({ ...cv, mode: event.target.value })}>
                      <option value="GENERAL">{t("Private sector / NGO / Bank")}</option>
                      <option value="PUBLIC_SERVICE">{t("Tanzania Public Service")}</option>
                    </select>
                  </label>
                  <label className={styles.field}>
                    <span>{t("CV language")}</span>
                    <select value={cv.language} onChange={(event) => setCv({ ...cv, language: event.target.value })}>
                      <option value="en">English</option>
                      <option value="sw">Kiswahili</option>
                    </select>
                  </label>
                </div>
              </>
            ) : null}

            {step === "summary" ? (
              <>
                <StepHead title={t("Professional summary")} text={t("3–5 lines on the role you want and the value you bring.")} />
                <TextArea
                  label={t("Summary")}
                  value={cv.content.summary}
                  onChange={(value) => updateContent({ ...cv.content, summary: value })}
                  placeholder={t("Describe your strongest relevant experience, sector knowledge and value.")}
                  rows={7}
                />
                <p className={styles.hint}>{t("{n} characters · aim for 300 to 600", { n: (cv.content.summary || "").length })}</p>
              </>
            ) : null}

            {step === "experience" ? (
              <>
                <StepHead title={t("Work experience")} text={t("Most recent first. Start each bullet with an action and add a real number where you have one.")} />
                <div className={styles.stack}>
                  {cv.content.experience.map((item, index) => (
                    <details className={styles.itemCard} key={index} open={index === 0 || !item.role}>
                      <summary>
                        <span className={styles.itemMark} aria-hidden="true">{initials(item.employer || item.role)}</span>
                        <span>
                          <strong>{item.role || t("New role")}</strong>
                          <small>{[item.employer, [item.startDate, item.endDate].filter(Boolean).join(" – ")].filter(Boolean).join(" · ")}</small>
                        </span>
                      </summary>
                      <div className={styles.itemBody}>
                        <div className={styles.grid2}>
                          <Field label={t("Role")} value={item.role} onChange={(value) => updateItem("experience", index, { role: value })} />
                          <Field label={t("Employer / organisation")} value={item.employer} onChange={(value) => updateItem("experience", index, { employer: value })} />
                          <Field label={t("Start")} value={item.startDate} onChange={(value) => updateItem("experience", index, { startDate: value })} placeholder="Jan 2024" />
                          <Field label={t("End")} value={item.endDate} onChange={(value) => updateItem("experience", index, { endDate: value })} placeholder={t("Present")} />
                        </div>
                        <Field label={t("Location")} value={item.location} onChange={(value) => updateItem("experience", index, { location: value })} />
                        <TextArea
                          label={t("Achievement bullets — one per line")}
                          value={(item.bullets || []).join("\n")}
                          onChange={(value) => updateItem("experience", index, { bullets: value.split("\n").map((line) => line.trim()).filter(Boolean) })}
                          placeholder={"Improved monthly reporting accuracy by 20%\nCoordinated ..."}
                          rows={5}
                        />
                        <button type="button" className={styles.removeButton} onClick={() => removeItem("experience", index)}>{t("Remove experience")}</button>
                      </div>
                    </details>
                  ))}
                  <button type="button" className={styles.addButton} onClick={() => addItem("experience")}>+ {t("Add experience")}</button>
                </div>
              </>
            ) : null}

            {step === "education" ? (
              <>
                <StepHead title={t("Education")} text={t("Your highest or most relevant qualification first.")} />
                <div className={styles.stack}>
                  {cv.content.education.map((item, index) => (
                    <details className={styles.itemCard} key={index} open={!item.qualification}>
                      <summary>
                        <span className={styles.itemMark} aria-hidden="true">{initials(item.institution || item.qualification)}</span>
                        <span>
                          <strong>{item.qualification || t("New qualification")}</strong>
                          <small>{[item.institution, [item.startYear, item.endYear].filter(Boolean).join(" – ")].filter(Boolean).join(" · ")}</small>
                        </span>
                      </summary>
                      <div className={styles.itemBody}>
                        <div className={styles.grid2}>
                          <Field label={t("Qualification")} value={item.qualification} onChange={(value) => updateItem("education", index, { qualification: value })} />
                          <Field label={t("Institution")} value={item.institution} onChange={(value) => updateItem("education", index, { institution: value })} />
                          <Field label={t("Start year")} value={item.startYear} onChange={(value) => updateItem("education", index, { startYear: value })} />
                          <Field label={t("End year")} value={item.endYear} onChange={(value) => updateItem("education", index, { endYear: value })} />
                        </div>
                        <Field label={t("Location")} value={item.location} onChange={(value) => updateItem("education", index, { location: value })} />
                        <TextArea label={t("Details")} value={item.details} onChange={(value) => updateItem("education", index, { details: value })} rows={3} />
                        <button type="button" className={styles.removeButton} onClick={() => removeItem("education", index)}>{t("Remove education")}</button>
                      </div>
                    </details>
                  ))}
                  <button type="button" className={styles.addButton} onClick={() => addItem("education")}>+ {t("Add education")}</button>
                </div>
              </>
            ) : null}

            {step === "skills" ? (
              <>
                <StepHead title={t("Skills")} text={t("6 to 12 skills you can show in your experience. Press Enter or comma to add one.")} />
                <SkillsInput
                  skills={cv.content.skills || []}
                  onChange={(skills) => updateContent({ ...cv.content, skills })}
                  t={t}
                />
              </>
            ) : null}

            {step === "more" ? (
              <>
                <StepHead title={t("More sections")} text={t("Optional sections. Public-service CVs need three referees.")} />
                <div className={styles.moreList}>
                  {MORE_SECTIONS.map(([section, label, fields]) => (
                    <section key={section} className={styles.moreSection}>
                      <h3 className={styles.subHead}>
                        {t(label)} <small>{cv.content[section].length}</small>
                      </h3>
                      {repeatSection(section, label, fields)}
                    </section>
                  ))}
                </div>
              </>
            ) : null}

            {step === "design" ? (
              <>
                <StepHead title={t("Design")} text={t("Change the look without changing any CV facts. Every option stays ATS-safe.")} />
                <div className={styles.designIntro}>
                  <div>
                    <strong>{t("ATS-safe design engine")}</strong>
                    <span>{t("Generate a fresh design without changing any CV facts.")}</span>
                  </div>
                  <button type="button" className={styles.addButton} onClick={generateDesign}>
                    {t("Generate design")}
                  </button>
                </div>
                <div className={styles.grid2}>
                  <label className={styles.field}>
                    <span>{t("Base personality")}</span>
                    <select value={cv.theme.template} onChange={(event) => setTheme({ template: event.target.value })}>
                      <option value="modern">Modern</option>
                      <option value="classic">Classic</option>
                      <option value="minimal">Minimal</option>
                      <option value="executive">Executive</option>
                      <option value="public">Public Service</option>
                    </select>
                  </label>
                  <div className={styles.colorRow}>
                    <label className={styles.field}>
                      <span>{t("Accent color")}</span>
                      <input type="color" value={cv.theme.accent} onChange={(event) => setTheme({ accent: event.target.value })} />
                    </label>
                    <Field label={t("Hex color")} value={cv.theme.accent} onChange={(value) => setTheme({ accent: value })} />
                  </div>
                  <label className={styles.field}>
                    <span>{t("ATS-safe font")}</span>
                    <select value={cv.theme.fontFamily} onChange={(event) => setTheme({ fontFamily: event.target.value })}>
                      <option>Arial</option>
                      <option>Georgia</option>
                      <option>Times New Roman</option>
                      <option>Trebuchet MS</option>
                      <option>Verdana</option>
                      <option>Tahoma</option>
                    </select>
                  </label>
                  <label className={styles.field}>
                    <span>{t("Density")}</span>
                    <select value={cv.theme.density} onChange={(event) => setTheme({ density: event.target.value })}>
                      <option value="compact">{t("Compact")}</option>
                      <option value="comfortable">{t("Comfortable")}</option>
                      <option value="spacious">{t("Spacious")}</option>
                    </select>
                  </label>
                  <label className={styles.field}>
                    <span>{t("Header")}</span>
                    <select value={cv.theme.headerAlign} onChange={(event) => setTheme({ headerAlign: event.target.value })}>
                      <option value="left">{t("Left aligned")}</option>
                      <option value="center">{t("Centered")}</option>
                    </select>
                  </label>
                  <label className={styles.field}>
                    <span>{t("Header treatment")}</span>
                    <select value={cv.theme.headerStyle || "clean"} onChange={(event) => setTheme({ headerStyle: event.target.value })}>
                      <option value="clean">{t("Clean")}</option>
                      <option value="rule">{t("Rule")}</option>
                      <option value="accent">{t("Accent")}</option>
                    </select>
                  </label>
                  <label className={styles.field}>
                    <span>{t("Section headings")}</span>
                    <select value={cv.theme.headingStyle} onChange={(event) => setTheme({ headingStyle: event.target.value })}>
                      <option value="line">{t("Line")}</option>
                      <option value="plain">{t("Plain")}</option>
                      <option value="caps">{t("Uppercase")}</option>
                      <option value="accent">{t("Accent")}</option>
                    </select>
                  </label>
                  <label className={styles.field}>
                    <span>{t("Bullet style")}</span>
                    <select value={cv.theme.bulletStyle || "disc"} onChange={(event) => setTheme({ bulletStyle: event.target.value })}>
                      <option value="disc">{t("Round")}</option>
                      <option value="square">{t("Square")}</option>
                      <option value="dash">{t("Dash")}</option>
                    </select>
                  </label>
                  <label className={styles.field}>
                    <span>{t("Contact separator")}</span>
                    <select value={cv.theme.contactStyle || "dots"} onChange={(event) => setTheme({ contactStyle: event.target.value })}>
                      <option value="dots">{t("Dots")}</option>
                      <option value="pipes">{t("Pipes")}</option>
                      <option value="lines">{t("Separate lines")}</option>
                    </select>
                  </label>
                  <label className={styles.field}>
                    <span>{t("Name size")}</span>
                    <select value={cv.theme.nameScale || "balanced"} onChange={(event) => setTheme({ nameScale: event.target.value })}>
                      <option value="compact">{t("Compact")}</option>
                      <option value="balanced">{t("Balanced")}</option>
                      <option value="prominent">{t("Prominent")}</option>
                    </select>
                  </label>
                  <label className={styles.field}>
                    <span>{t("Page margin")}</span>
                    <select value={cv.theme.pageMargin || "standard"} onChange={(event) => setTheme({ pageMargin: event.target.value })}>
                      <option value="narrow">{t("Narrow")}</option>
                      <option value="standard">{t("Standard")}</option>
                      <option value="wide">{t("Wide")}</option>
                    </select>
                  </label>
                </div>
                <div className={styles.orderList}>
                  <span>{t("Section order")}</span>
                  {cv.theme.sectionOrder.map((key, index) => (
                    <div key={key}>
                      <strong>{t(SECTION_NAMES[key])}</strong>
                      <span>
                        <button
                          type="button"
                          aria-label={t("Move up")}
                          disabled={index === 0}
                          onClick={() => {
                            const order = [...cv.theme.sectionOrder];
                            [order[index - 1], order[index]] = [order[index], order[index - 1]];
                            setTheme({ sectionOrder: order });
                          }}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          aria-label={t("Move down")}
                          disabled={index === cv.theme.sectionOrder.length - 1}
                          onClick={() => {
                            const order = [...cv.theme.sectionOrder];
                            [order[index + 1], order[index]] = [order[index], order[index + 1]];
                            setTheme({ sectionOrder: order });
                          }}
                        >
                          ↓
                        </button>
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : null}
          </div>

          <footer className={styles.stepFooter}>
            <button type="button" className={dash.button} onClick={() => goTo(-1)} disabled={stepIndex === 0}>
              ← {t("Back")}
            </button>
            <span>{t("Step {n} of {total}", { n: stepIndex + 1, total: STEPS.length })}</span>
            {stepIndex < STEPS.length - 1 ? (
              <button type="button" className={dash.buttonPrimary} onClick={() => goTo(1)}>
                {t("Next")}: {t(STEPS[stepIndex + 1].label)} →
              </button>
            ) : (
              <button type="button" className={dash.buttonPrimary} onClick={saveCv} disabled={busy}>
                {busy ? t("Saving…") : t("Save CV")}
              </button>
            )}
          </footer>
          {status ? <p className={styles.status} role="status">{status}</p> : null}
        </section>

        <aside className={styles.side} aria-label={t("CV score and preview")}>
          <section className={styles.scoreCard}>
            <div className={styles.scoreTop}>
              <ScoreRing score={score} />
              <div>
                <h2>{t("ATS readiness")}</h2>
                <p>{score >= 90 ? t("Ready to send.") : score >= 70 ? t("Almost there.") : t("Keep going.")}</p>
                {evaluation?.matchScore !== null && evaluation?.matchScore !== undefined ? (
                  <p className={styles.match}>
                    {t("Job match")} <strong>{evaluation.matchScore}%</strong>
                  </p>
                ) : null}
              </div>
            </div>
            {job ? <p className={styles.tailoring}>{t("Tailoring for")}: <strong>{job.title}</strong> · {job.company}</p> : null}
            <ul className={styles.checks}>
              {checks.map((check) => (
                <li key={check.label} className={check.done ? styles.checkDone : ""}>
                  <span aria-hidden="true" />
                  {t(check.label)}
                  <span className="sr-only">{check.done ? t("done") : t("to do")}</span>
                </li>
              ))}
            </ul>
            {evaluation?.suggestions?.length ? (
              <details className={styles.tips}>
                <summary>{t("{n} ways to improve", { n: evaluation.suggestions.length })}</summary>
                <ul>
                  {evaluation.suggestions.map((suggestion) => <li key={suggestion}>{t(suggestion)}</li>)}
                </ul>
              </details>
            ) : null}
            <p className={styles.fine}>
              {t("Aim for 90+ ATS readiness. Job match measures supported relevance to the selected vacancy; neither score guarantees shortlisting or interview.")}
            </p>
          </section>

          <section className={styles.previewCard}>
            <div className={styles.previewHead}>
              <h2>{t("Live preview")}</h2>
              <div className={styles.templateChips} role="group" aria-label={t("Template")}>
                {templateChips.map((template) => (
                  <button
                    type="button"
                    key={template}
                    aria-pressed={cv.theme.template === template}
                    className={cv.theme.template === template ? styles.chipActive : ""}
                    onClick={() => setTheme({ template })}
                  >
                    {t(TEMPLATE_LABELS[template])}
                  </button>
                ))}
              </div>
            </div>
            <div className={`${styles.paper} cv-print-target`}>
              <CvPreview cv={cv} />
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
