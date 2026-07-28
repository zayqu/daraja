import Link from "next/link";

export const metadata = {
  title: "Manage Job Alerts",
  robots: { index: false, follow: false },
};

const TOKEN_PATTERN = /^[0-9a-f-]{36}$/i;

export default async function UnsubscribePage({ searchParams }) {
  const params = await searchParams;
  const token = String(params?.token || "");
  const valid = TOKEN_PATTERN.test(token);
  const action = valid
    ? `/api/job-alerts?unsubscribe=${encodeURIComponent(token)}`
    : "";

  return (
    <main
      id="main-content"
      style={{ maxWidth: "620px", margin: "0 auto", padding: "5rem 1.25rem" }}
    >
      <h1>{valid ? "Stop job-alert emails?" : "This link is not valid"}</h1>
      <p style={{ margin: "1rem 0 1.5rem", color: "#667085", lineHeight: 1.7 }}>
        {valid
          ? "Confirm below and Daraja will stop sending job-alert emails to this address. You can subscribe again at any time."
          : "Please use the unsubscribe link from your latest Daraja job-alert email."}
      </p>
      {valid ? (
        <form method="post" action={action}>
          <button
            type="submit"
            style={{
              minHeight: "46px",
              border: 0,
              borderRadius: "6px",
              padding: "0.75rem 1.1rem",
              background: "#1b2a3f",
              color: "#fff",
              font: "inherit",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Unsubscribe from job alerts
          </button>
        </form>
      ) : (
        <Link href="/jobs" style={{ color: "#087f6c", fontWeight: 600 }}>
          Browse current jobs →
        </Link>
      )}
    </main>
  );
}
