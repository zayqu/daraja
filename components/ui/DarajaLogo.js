// Daraja bridge mark + wordmark. `tone="light"` is for navy backgrounds.
export default function DarajaLogo({ tone = "dark", product = "AJIRA", className = "" }) {
  const word = tone === "light" ? "#ffffff" : "var(--color-text)";
  return (
    <span className={className} style={{ display: "inline-flex", alignItems: "center", gap: "0.55rem" }}>
      <svg width="34" height="22" viewBox="0 0 34 22" aria-hidden="true" focusable="false">
        <path d="M2 17C6 6.5 12 3 17 3s11 3.5 15 14" fill="none" stroke="#00c9a7" strokeWidth="2.6" strokeLinecap="round" />
        <path d="M8 9.6V17M12.5 6.3V17M17 5.2V17M21.5 6.3V17M26 9.6V17" stroke="#00c9a7" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M1 18.2h32" stroke={tone === "light" ? "#ffffff" : "var(--color-text)"} strokeWidth="2.4" strokeLinecap="round" />
      </svg>
      <span style={{ display: "grid", lineHeight: 1 }}>
        <span style={{ color: word, fontFamily: "var(--font-display)", fontSize: "1.05rem", fontWeight: 800, letterSpacing: "0.06em" }}>
          DARAJA
        </span>
        {product ? (
          <span style={{ marginTop: "0.2rem", color: "#00c9a7", fontSize: "0.55rem", fontWeight: 700, letterSpacing: "0.32em" }}>
            {product}
          </span>
        ) : null}
      </span>
    </span>
  );
}
