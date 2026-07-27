import Link from "next/link";

export const metadata = {
  title: "Email Alerts Updated",
  robots: { index: false, follow: false },
};

export default async function UnsubscribedPage({ searchParams }) {
  const params = await searchParams;
  const failed = params?.status === "error" || params?.status === "invalid";

  return (
    <main
      id="main-content"
      style={{ maxWidth: "620px", margin: "0 auto", padding: "5rem 1.25rem" }}
    >
      <h1>{failed ? "We could not update your alerts" : "You are unsubscribed"}</h1>
      <p style={{ margin: "1rem 0 1.5rem", color: "#667085", lineHeight: 1.7 }}>
        {failed
          ? "The unsubscribe link is invalid or could not be processed. Please try the link from your latest Daraja email."
          : "Daraja will no longer send job-alert emails to this address. You can subscribe again at any time."}
      </p>
      <Link href="/jobs" style={{ color: "#087f6c", fontWeight: 600 }}>
        Browse current jobs →
      </Link>
    </main>
  );
}
