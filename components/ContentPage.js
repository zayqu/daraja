import Link from "next/link";

export default function ContentPage({ title, description, children }) {
  return (
    <main
      id="main-content"
      style={{
        maxWidth: "760px",
        margin: "0 auto",
        padding: "3rem 1.25rem 5rem",
        color: "#1B2A3F",
        lineHeight: 1.75,
      }}
    >
      <Link href="/" style={{ color: "#087F6C", fontWeight: 600 }}>
        ← Back to Daraja Jobs
      </Link>
      <h1 style={{ margin: "1.5rem 0 0.5rem", lineHeight: 1.25 }}>{title}</h1>
      {description && <p style={{ color: "#667085" }}>{description}</p>}
      <div className="content-page-body">{children}</div>
      <style>{`
        .content-page-body h2 { margin-top: 2rem; line-height: 1.3; }
        .content-page-body h3 { margin-top: 1.5rem; line-height: 1.4; }
        .content-page-body p, .content-page-body ul { margin-top: 0.75rem; }
        .content-page-body ul { padding-left: 1.25rem; }
        .content-page-body a { color: #087f6c; font-weight: 600; }
      `}</style>
    </main>
  );
}
