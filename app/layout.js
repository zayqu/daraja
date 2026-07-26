import "./globals.css";
import Script from "next/script";

export const metadata = {
  metadataBase: new URL("https://www.ajira.daraja.co.tz"),
  title: {
    default: "Jobs in Tanzania | Daraja",
    template: "%s | Daraja",
  },
  description:
    "Find current government, NGO, finance, health, education, IT and engineering jobs across Tanzania.",
  applicationName: "Daraja Jobs",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_TZ",
    siteName: "Daraja Jobs",
    title: "Jobs in Tanzania | Daraja",
    description:
      "Find current jobs and career opportunities across Tanzania.",
    url: "/",
  },
};

export default function RootLayout({ children }) {
  const adsenseClient = process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT;

  return (
    <html lang="en">
      <body>
        {children}
        {adsenseClient && (
          <Script
            id="google-adsense"
            async
            strategy="afterInteractive"
            crossOrigin="anonymous"
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(adsenseClient)}`}
          />
        )}
      </body>
    </html>
  );
}
