"use client";

const LABELS = {
  en: {
    summary: "Professional summary",
    experience: "Experience",
    education: "Education",
    skills: "Skills",
    certifications: "Certifications",
    trainings: "Training",
    projects: "Projects",
    languages: "Languages",
    references: "Referees",
    present: "Present",
  },
  sw: {
    summary: "Muhtasari wa kitaaluma",
    experience: "Uzoefu",
    education: "Elimu",
    skills: "Ujuzi",
    certifications: "Vyeti vya kitaaluma",
    trainings: "Mafunzo",
    projects: "Miradi",
    languages: "Lugha",
    references: "Waamuzi",
    present: "Sasa",
  },
};

function dateRange(item, present) {
  const start = item.startDate || item.startYear || "";
  const end = item.current ? present : item.endDate || item.endYear || "";
  return [start, end].filter(Boolean).join(" – ");
}

export default function CvPreview({ cv }) {
  if (!cv) return null;
  const content = cv.content || {};
  const theme = cv.theme || {};
  const labels = LABELS[cv.language] || LABELS.en;
  const order = theme.sectionOrder || [];
  const personal = content.personal || {};

  const sections = {
    summary:
      content.summary ? (
        <section>
          <h2>{labels.summary}</h2>
          <p>{content.summary}</p>
        </section>
      ) : null,
    experience:
      content.experience?.length ? (
        <section>
          <h2>{labels.experience}</h2>
          {content.experience.map((item, index) => (
            <article key={index}>
              <div className="cv-row">
                <div>
                  <h3>{item.role || "Role"}</h3>
                  <strong>{item.employer}</strong>
                  {item.location ? <span> · {item.location}</span> : null}
                </div>
                <span className="cv-date">{dateRange(item, labels.present)}</span>
              </div>
              {item.bullets?.length ? (
                <ul>
                  {item.bullets.map((bullet, bulletIndex) => (
                    <li key={bulletIndex}>{bullet}</li>
                  ))}
                </ul>
              ) : null}
            </article>
          ))}
        </section>
      ) : null,
    education:
      content.education?.length ? (
        <section>
          <h2>{labels.education}</h2>
          {content.education.map((item, index) => (
            <article key={index}>
              <div className="cv-row">
                <div>
                  <h3>{item.qualification || "Qualification"}</h3>
                  <strong>{item.institution}</strong>
                  {item.location ? <span> · {item.location}</span> : null}
                </div>
                <span className="cv-date">{dateRange(item, labels.present)}</span>
              </div>
              {item.details ? <p>{item.details}</p> : null}
            </article>
          ))}
        </section>
      ) : null,
    skills:
      content.skills?.length ? (
        <section>
          <h2>{labels.skills}</h2>
          <p className="cv-inline-list">{content.skills.join(" · ")}</p>
        </section>
      ) : null,
    certifications:
      content.certifications?.length ? (
        <section>
          <h2>{labels.certifications}</h2>
          <ul className="cv-clean-list">
            {content.certifications.map((item, index) => (
              <li key={index}>
                <strong>{item.name}</strong>
                {[item.issuer, item.year].filter(Boolean).length
                  ? ` — ${[item.issuer, item.year].filter(Boolean).join(", ")}`
                  : ""}
              </li>
            ))}
          </ul>
        </section>
      ) : null,
    trainings:
      content.trainings?.length ? (
        <section>
          <h2>{labels.trainings}</h2>
          <ul className="cv-clean-list">
            {content.trainings.map((item, index) => (
              <li key={index}>
                <strong>{item.name}</strong>
                {[item.provider, item.year].filter(Boolean).length
                  ? ` — ${[item.provider, item.year].filter(Boolean).join(", ")}`
                  : ""}
              </li>
            ))}
          </ul>
        </section>
      ) : null,
    projects:
      content.projects?.length ? (
        <section>
          <h2>{labels.projects}</h2>
          {content.projects.map((item, index) => (
            <article key={index}>
              <h3>{item.name}</h3>
              {item.description ? <p>{item.description}</p> : null}
              {item.link ? <p>{item.link}</p> : null}
            </article>
          ))}
        </section>
      ) : null,
    languages:
      content.languages?.length ? (
        <section>
          <h2>{labels.languages}</h2>
          <p className="cv-inline-list">
            {content.languages
              .map((item) => [item.name, item.level].filter(Boolean).join(" — "))
              .join(" · ")}
          </p>
        </section>
      ) : null,
    references:
      content.references?.length ? (
        <section>
          <h2>{labels.references}</h2>
          <div className="cv-reference-grid">
            {content.references.map((item, index) => (
              <article key={index}>
                <h3>{item.name}</h3>
                {[item.title, item.organisation].filter(Boolean).map((part) => (
                  <p key={part}>{part}</p>
                ))}
                {item.phone ? <p>{item.phone}</p> : null}
                {item.email ? <p>{item.email}</p> : null}
              </article>
            ))}
          </div>
        </section>
      ) : null,
  };

  const contacts = [
    personal.phone,
    personal.email,
    personal.location,
    cv.mode === "PUBLIC_SERVICE" ? personal.postalAddress : null,
    personal.linkedIn,
    personal.portfolio,
  ].filter(Boolean);

  return (
    <article
      className="cv-document"
      data-template={theme.template || "modern"}
      data-density={theme.density || "comfortable"}
      data-heading={theme.headingStyle || "line"}
      style={{
        "--cv-accent": theme.accent || "#1b2a3f",
        "--cv-font": theme.fontFamily || "Arial",
        "--cv-header-align": theme.headerAlign || "left",
      }}
    >
      <header className="cv-header">
        <h1>{personal.fullName || "Your name"}</h1>
        {personal.headline ? <p className="cv-headline">{personal.headline}</p> : null}
        {contacts.length ? <p className="cv-contacts">{contacts.join(" · ")}</p> : null}
      </header>

      {order.map((key) => (sections[key] ? <div key={key}>{sections[key]}</div> : null))}
    </article>
  );
}
