"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import CvPreview from "@/components/CvPreview";
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

export default function CvBuilder() {
  const searchParams = useSearchParams();
  const requestedJob = searchParams.get("job") || "";
  const [cvs, setCvs] = useState([]);
  const [activeId, setActiveId] = useState("");
  const [cv, setCv] = useState(null);
  const [job, setJob] = useState(null);
  const [evaluation, setEvaluation] = useState(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

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
          name: sourceCvId ? `${cv?.name || "CV"} copy` : "Master CV",
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

  async function saveCv() {
    if (!cv) return;
    setBusy(true);
    setStatus("");
    try {
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
      setStatus("Saved.");
      await loadList();
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

  const designCount = useMemo(() => {
    if (!cv) return "";
    return `${cv.theme?.template || "modern"} · ${cv.theme?.accent || "#1b2a3f"} · ${cv.theme?.fontFamily || "Arial"}`;
  }, [cv]);

  if (!cvs.length && !activeId) {
    return (
      <section className={styles.empty}>
        <span>Daraja CV Builder</span>
        <h2>Build your first ATS-ready CV.</h2>
        <p>
          Start from your private Daraja profile, then shape it for private-sector,
          NGO, bank or Tanzania public-service applications.
        </p>
        <button type="button" onClick={() => createCv()} disabled={busy}>
          {busy ? "Creating…" : "Create my Master CV"}
        </button>
        {status ? <p className={styles.status}>{status}</p> : null}
      </section>
    );
  }

  if (!cv) return <p className={styles.status}>Loading CV builder…</p>;

  const personal = cv.content.personal || {};

  return (
    <div className={styles.builder}>
      <aside className={styles.sidebar}>
        <div className={styles.sideHeading}>
          <span>Your CVs</span>
          <button type="button" onClick={() => createCv()} disabled={busy}>+ New</button>
        </div>
        <div className={styles.versionList}>
          {cvs.map((item) => (
            <button
              type="button"
              key={item.id}
              className={item.id === activeId ? styles.activeVersion : ""}
              onClick={() => setActiveId(item.id)}
            >
              <strong>{item.name}</strong>
              <span>{item.kind === "TAILORED" ? "Tailored" : "Master"} · {item.atsScore}/100</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => createCv(cv.id)}
          disabled={busy}
        >
          Duplicate for another job
        </button>
        <button
          type="button"
          className={styles.dangerButton}
          onClick={deleteCv}
          disabled={busy}
        >
          Delete this CV
        </button>
      </aside>

      <div className={styles.workspace}>
        <div className={styles.toolbar}>
          <div>
            <span>Daraja Smart CV</span>
            <strong>{designCount}</strong>
          </div>
          <div className={styles.toolbarActions}>
            <button type="button" onClick={() => window.print()}>Save as PDF</button>
            <button type="button" className={styles.primaryButton} onClick={saveCv} disabled={busy}>
              {busy ? "Saving…" : "Save CV"}
            </button>
          </div>
        </div>

        <div className={styles.columns}>
          <section className={styles.editor} aria-label="CV editor">
            <details open>
              <summary>CV setup</summary>
              <div className={styles.panel}>
                <Field label="CV name" value={cv.name} onChange={(value) => setCv({ ...cv, name: value })} />
                <Field label="Target role" value={cv.targetRole} onChange={(value) => setCv({ ...cv, targetRole: value })} placeholder="e.g. Relationship Manager" />
                <label className={styles.field}>
                  <span>Application mode</span>
                  <select value={cv.mode} onChange={(event) => setCv({ ...cv, mode: event.target.value })}>
                    <option value="GENERAL">Private sector / NGO / Bank</option>
                    <option value="PUBLIC_SERVICE">Tanzania Public Service</option>
                  </select>
                </label>
                <label className={styles.field}>
                  <span>CV language</span>
                  <select value={cv.language} onChange={(event) => setCv({ ...cv, language: event.target.value })}>
                    <option value="en">English</option>
                    <option value="sw">Kiswahili</option>
                  </select>
                </label>
              </div>
            </details>

            <details open>
              <summary>Contact & headline</summary>
              <div className={styles.panel}>
                <Field label="Full name" value={personal.fullName} onChange={(value) => updatePersonal("fullName", value)} />
                <Field label="Professional headline" value={personal.headline} onChange={(value) => updatePersonal("headline", value)} />
                <Field label="Phone" value={personal.phone} onChange={(value) => updatePersonal("phone", value)} placeholder="+255..." />
                <Field label="Email" type="email" value={personal.email} onChange={(value) => updatePersonal("email", value)} />
                <Field label="Location" value={personal.location} onChange={(value) => updatePersonal("location", value)} placeholder="Dar es Salaam" />
                {cv.mode === "PUBLIC_SERVICE" ? (
                  <Field label="Postal address / postcode" value={personal.postalAddress} onChange={(value) => updatePersonal("postalAddress", value)} />
                ) : null}
                <Field label="LinkedIn" value={personal.linkedIn} onChange={(value) => updatePersonal("linkedIn", value)} />
                <Field label="Portfolio" value={personal.portfolio} onChange={(value) => updatePersonal("portfolio", value)} />
              </div>
            </details>

            <details open>
              <summary>Professional summary</summary>
              <div className={styles.panel}>
                <TextArea
                  label="3–5 lines focused on the role you want"
                  value={cv.content.summary}
                  onChange={(value) => updateContent({ ...cv.content, summary: value })}
                  placeholder="Describe your strongest relevant experience, sector knowledge and value."
                  rows={5}
                />
              </div>
            </details>

            <details open>
              <summary>Experience</summary>
              <div className={styles.panel}>
                {cv.content.experience.map((item, index) => (
                  <div className={styles.repeatCard} key={index}>
                    <Field label="Role" value={item.role} onChange={(value) => updateItem("experience", index, { role: value })} />
                    <Field label="Employer / organisation" value={item.employer} onChange={(value) => updateItem("experience", index, { employer: value })} />
                    <Field label="Location" value={item.location} onChange={(value) => updateItem("experience", index, { location: value })} />
                    <div className={styles.twoCol}>
                      <Field label="Start" value={item.startDate} onChange={(value) => updateItem("experience", index, { startDate: value })} placeholder="Jan 2024" />
                      <Field label="End" value={item.endDate} onChange={(value) => updateItem("experience", index, { endDate: value })} placeholder="Present" />
                    </div>
                    <TextArea
                      label="Achievement bullets — one per line"
                      value={(item.bullets || []).join("\n")}
                      onChange={(value) => updateItem("experience", index, { bullets: value.split("\n").map((line) => line.trim()).filter(Boolean) })}
                      placeholder={"Improved monthly reporting accuracy by 20%\nCoordinated ..."}
                      rows={5}
                    />
                    <button type="button" className={styles.removeButton} onClick={() => removeItem("experience", index)}>Remove experience</button>
                  </div>
                ))}
                <button type="button" className={styles.addButton} onClick={() => addItem("experience")}>+ Add experience</button>
              </div>
            </details>

            <details>
              <summary>Education</summary>
              <div className={styles.panel}>
                {cv.content.education.map((item, index) => (
                  <div className={styles.repeatCard} key={index}>
                    <Field label="Qualification" value={item.qualification} onChange={(value) => updateItem("education", index, { qualification: value })} />
                    <Field label="Institution" value={item.institution} onChange={(value) => updateItem("education", index, { institution: value })} />
                    <Field label="Location" value={item.location} onChange={(value) => updateItem("education", index, { location: value })} />
                    <div className={styles.twoCol}>
                      <Field label="Start year" value={item.startYear} onChange={(value) => updateItem("education", index, { startYear: value })} />
                      <Field label="End year" value={item.endYear} onChange={(value) => updateItem("education", index, { endYear: value })} />
                    </div>
                    <TextArea label="Details" value={item.details} onChange={(value) => updateItem("education", index, { details: value })} rows={3} />
                    <button type="button" className={styles.removeButton} onClick={() => removeItem("education", index)}>Remove education</button>
                  </div>
                ))}
                <button type="button" className={styles.addButton} onClick={() => addItem("education")}>+ Add education</button>
              </div>
            </details>

            <details>
              <summary>Skills</summary>
              <div className={styles.panel}>
                <TextArea
                  label="Skills separated by commas"
                  value={(cv.content.skills || []).join(", ")}
                  onChange={(value) => updateContent({ ...cv.content, skills: value.split(",").map((skill) => skill.trim()).filter(Boolean) })}
                  placeholder="Financial analysis, Customer service, Excel, Credit analysis"
                  rows={4}
                />
              </div>
            </details>

            {[
              ["certifications", "Certifications", ["name", "issuer", "year"]],
              ["trainings", "Training", ["name", "provider", "year"]],
              ["languages", "Languages", ["name", "level"]],
              ["references", "Referees", ["name", "title", "organisation", "phone", "email"]],
              ["projects", "Projects", ["name", "description", "link"]],
            ].map(([section, label, fields]) => (
              <details key={section}>
                <summary>{label}</summary>
                <div className={styles.panel}>
                  {cv.content[section].map((item, index) => (
                    <div className={styles.repeatCard} key={index}>
                      {fields.map((field) =>
                        field === "description" ? (
                          <TextArea key={field} label={field} value={item[field]} onChange={(value) => updateItem(section, index, { [field]: value })} rows={3} />
                        ) : (
                          <Field key={field} label={field} value={item[field]} onChange={(value) => updateItem(section, index, { [field]: value })} />
                        )
                      )}
                      <button type="button" className={styles.removeButton} onClick={() => removeItem(section, index)}>Remove</button>
                    </div>
                  ))}
                  <button type="button" className={styles.addButton} onClick={() => addItem(section)}>+ Add {label.toLowerCase()}</button>
                </div>
              </details>
            ))}

            <details open>
              <summary>Design</summary>
              <div className={styles.panel}>
                <label className={styles.field}>
                  <span>Template treatment</span>
                  <select value={cv.theme.template} onChange={(event) => setCv({ ...cv, theme: { ...cv.theme, template: event.target.value } })}>
                    <option value="modern">Modern</option>
                    <option value="classic">Classic</option>
                    <option value="minimal">Minimal</option>
                    <option value="executive">Executive</option>
                    <option value="public">Public Service</option>
                  </select>
                </label>
                <div className={styles.colorRow}>
                  <label className={styles.field}>
                    <span>Accent color</span>
                    <input type="color" value={cv.theme.accent} onChange={(event) => setCv({ ...cv, theme: { ...cv.theme, accent: event.target.value } })} />
                  </label>
                  <Field label="Hex color" value={cv.theme.accent} onChange={(value) => setCv({ ...cv, theme: { ...cv.theme, accent: value } })} />
                </div>
                <label className={styles.field}>
                  <span>ATS-safe font</span>
                  <select value={cv.theme.fontFamily} onChange={(event) => setCv({ ...cv, theme: { ...cv.theme, fontFamily: event.target.value } })}>
                    <option>Arial</option>
                    <option>Georgia</option>
                    <option>Times New Roman</option>
                    <option>Trebuchet MS</option>
                  </select>
                </label>
                <label className={styles.field}>
                  <span>Density</span>
                  <select value={cv.theme.density} onChange={(event) => setCv({ ...cv, theme: { ...cv.theme, density: event.target.value } })}>
                    <option value="compact">Compact</option>
                    <option value="comfortable">Comfortable</option>
                    <option value="spacious">Spacious</option>
                  </select>
                </label>
                <label className={styles.field}>
                  <span>Header</span>
                  <select value={cv.theme.headerAlign} onChange={(event) => setCv({ ...cv, theme: { ...cv.theme, headerAlign: event.target.value } })}>
                    <option value="left">Left aligned</option>
                    <option value="center">Centered</option>
                  </select>
                </label>
                <label className={styles.field}>
                  <span>Section headings</span>
                  <select value={cv.theme.headingStyle} onChange={(event) => setCv({ ...cv, theme: { ...cv.theme, headingStyle: event.target.value } })}>
                    <option value="line">Line</option>
                    <option value="plain">Plain</option>
                    <option value="caps">Uppercase</option>
                  </select>
                </label>
                <div className={styles.orderList}>
                  <span>Section order</span>
                  {cv.theme.sectionOrder.map((key, index) => (
                    <div key={key}>
                      <strong>{SECTION_NAMES[key]}</strong>
                      <span>
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => {
                            const order = [...cv.theme.sectionOrder];
                            [order[index - 1], order[index]] = [order[index], order[index - 1]];
                            setCv({ ...cv, theme: { ...cv.theme, sectionOrder: order } });
                          }}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          disabled={index === cv.theme.sectionOrder.length - 1}
                          onClick={() => {
                            const order = [...cv.theme.sectionOrder];
                            [order[index + 1], order[index]] = [order[index], order[index + 1]];
                            setCv({ ...cv, theme: { ...cv.theme, sectionOrder: order } });
                          }}
                        >
                          ↓
                        </button>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </details>
          </section>

          <section className={styles.previewPane} aria-label="CV preview">
            <div className={styles.scoreCard}>
              <div>
                <span>ATS readiness</span>
                <strong>{evaluation?.score ?? cv.atsScore}/100</strong>
              </div>
              {evaluation?.matchScore !== null && evaluation?.matchScore !== undefined ? (
                <div>
                  <span>Selected job match</span>
                  <strong>{evaluation.matchScore}%</strong>
                </div>
              ) : null}
              <p>
                This is a quality/readiness score, not a guarantee of shortlisting or interview.
              </p>
              {job ? <p><strong>Tailoring for:</strong> {job.title} · {job.company}</p> : null}
              {evaluation?.suggestions?.length ? (
                <ul>
                  {evaluation.suggestions.map((suggestion) => <li key={suggestion}>{suggestion}</li>)}
                </ul>
              ) : null}
            </div>
            <div className={styles.paper}>
              <CvPreview cv={cv} />
            </div>
          </section>
        </div>

        {status ? <p className={styles.status}>{status}</p> : null}
      </div>
    </div>
  );
}
