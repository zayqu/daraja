// Branded 1200x630 share card used as the WhatsApp / social link preview.
// Rendered by next/og (Satori), so only flexbox and inline styles apply.

export const OG_SIZE = { width: 1200, height: 630 };

const INK = "#0f2233";
const TEAL = "#08b99d";
const MUTED = "#5f6b7a";

function shorten(value, max) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

function formatDeadline(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Africa/Dar_es_Salaam",
  });
}

function Chip({ children }) {
  return (
    <div
      style={{
        display: "flex",
        padding: "10px 22px",
        borderRadius: 999,
        background: "#e6f8f4",
        color: "#0b6b59",
        fontSize: 28,
        fontWeight: 600,
      }}
    >
      {children}
    </div>
  );
}

// job: { title, company, location, deadline } or null for the general card.
export function ShareCard({ job = null }) {
  const title = job ? shorten(job.title, 70) : "Find your next job in Tanzania";
  const subtitle = job
    ? shorten(job.company, 70)
    : "Government, NGO, bank and private sector vacancies, updated every day.";
  const deadline = job ? formatDeadline(job.deadline) : null;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "#ffffff",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", height: 16, background: TEAL }} />
      <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "48px 72px 0" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 18 }}>
          <div style={{ display: "flex", fontSize: 44, fontWeight: 800, color: TEAL, letterSpacing: 4 }}>DARAJA</div>
          <div style={{ display: "flex", fontSize: 22, color: MUTED, letterSpacing: 3 }}>KAZI NA FURSA TANZANIA</div>
        </div>
        <div style={{ display: "flex", marginTop: 44, fontSize: 26, fontWeight: 700, color: TEAL, letterSpacing: 2 }}>
          {job ? "JOB OPPORTUNITY" : "AJIRA.DARAJA.CO.TZ"}
        </div>
        <div style={{ display: "flex", marginTop: 12, fontSize: title.length > 48 ? 54 : 70, fontWeight: 800, color: INK, lineHeight: 1.1 }}>
          {title}
        </div>
        <div style={{ display: "flex", marginTop: 18, fontSize: 32, color: MUTED }}>{subtitle}</div>
        {job && (
          <div style={{ display: "flex", gap: 16, marginTop: 30 }}>
            {job.location && <Chip>{shorten(job.location, 40)}</Chip>}
            <Chip>{deadline ? `Deadline ${deadline}` : "No deadline stated"}</Chip>
          </div>
        )}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "26px 72px",
          background: INK,
          color: "#ffffff",
          fontSize: 28,
        }}
      >
        <div style={{ display: "flex", fontWeight: 700 }}>{job ? "Apply free on Daraja" : "No fees. Apply directly."}</div>
        <div style={{ display: "flex", color: "#7fe3cf" }}>See all vacancies: ajira.daraja.co.tz/jobs</div>
      </div>
    </div>
  );
}
