import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import PrivacyControls from "@/components/PrivacyControls";
import SiteFooterLinks from "@/components/SiteFooterLinks";
import WebVitals from "@/components/WebVitals";
import MobileDock from "@/components/ui/MobileDock";
import { candidateCareerEnabled, employerPortalEnabled } from "@/lib/features";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

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
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }) {
  const adsenseClient = process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT;
  const analyticsId =
    process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID || "G-89Q157X930";
  const showEmployerCta = employerPortalEnabled();
  const showCandidateProfile = candidateCareerEnabled();

  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <a className="skip-link" href="#main-content">
          Skip to main content
        </a>
        {children}
        <SiteFooterLinks />
        <MobileDock showEmployerCta={showEmployerCta} showCandidateProfile={showCandidateProfile} />
        <WebVitals analyticsId={analyticsId} />
        <PrivacyControls analyticsId={analyticsId} adsenseClient={adsenseClient} />
      </body>
    </html>
  );
}
