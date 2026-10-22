import { Suspense } from "react";
import { Nunito } from "next/font/google";
import "./globals.css";
import PrivacyControls from "@/components/PrivacyControls";
import SiteFooterLinks from "@/components/SiteFooterLinks";
import WebVitals from "@/components/WebVitals";
import TrafficTracker from "@/components/TrafficTracker";
import MobileDock from "@/components/ui/MobileDock";
import {
  candidateCareerEnabled,
  employerPortalEnabled,
  loadSiteSettings,
  monetagEnabled,
} from "@/lib/features";
import { auth } from "@/auth";
import { SITE_ORIGIN } from "@/lib/site-config";

const ADSENSE_CLIENT = "ca-pub-5101856964689063";
// Monetag zones for ajira.daraja.co.tz (site 3521615). Only AdSense-compatible
// formats are used: In-Page Push and Vignette. Never add Onclick/Popunder or
// MultiTag here — AdSense does not allow pop-unders on the same site.
// Paused while Google AdSense reviews the site (D-032, 12 October 2026): the
// Vignette is a full-screen interstitial that can block AdSense approval.
// Switch back on after approval in /admin/settings ("Monetag ads"); the
// NEXT_PUBLIC_MONETAG_ENABLED === "true" environment value is only the default.
// The monetag meta tag and public/sw.js stay in place for site verification.
function monetagZones() {
  return monetagEnabled()
    ? {
        inPagePush: process.env.NEXT_PUBLIC_MONETAG_IN_PAGE_PUSH_ZONE || "11974650",
        vignette: process.env.NEXT_PUBLIC_MONETAG_VIGNETTE_ZONE || "11974652",
      }
    : {};
}

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1b2a3f",
};

export const metadata = {
  metadataBase: new URL(SITE_ORIGIN),
  title: {
    default: "Jobs in Tanzania | Daraja",
    template: "%s | Daraja",
  },
  description:
    "Find current government, NGO, finance, health, education, IT and engineering jobs across Tanzania.",
  applicationName: "Daraja Jobs",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/icon.png", type: "image/png" }],
  },
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

export default async function RootLayout({ children }) {
  const adsenseClient =
    process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT || ADSENSE_CLIENT;
  const analyticsId =
    process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID || "G-89Q157X930";
  await loadSiteSettings();
  const showEmployerCta = employerPortalEnabled();
  const showCandidateProfile = candidateCareerEnabled();
  const session = await auth();
  const userRole = session?.user?.role || null;
  const rootFontClass = `${nunito.variable} ${nunito.className}`;

  return (
    <html lang="en" className={rootFontClass}>
      <head>
        <meta name="google-adsense-account" content={ADSENSE_CLIENT} />
        <meta name="monetag" content="24ec21c9a26eaee13c92a0b60e24c6c8" />
      </head>
      <body className={nunito.className}>
        <a className="skip-link" href="#main-content">
          Skip to main content
        </a>
        {children}
        <SiteFooterLinks />
        <Suspense fallback={null}>
          <MobileDock
            showEmployerCta={showEmployerCta}
            showCandidateProfile={showCandidateProfile}
            userRole={userRole}
          />
        </Suspense>
        <Suspense fallback={null}>
          <TrafficTracker />
        </Suspense>
        <WebVitals analyticsId={analyticsId} />
        <PrivacyControls
          analyticsId={analyticsId}
          adsenseClient={adsenseClient}
          monetagZones={monetagZones()}
        />
      </body>
    </html>
  );
}
