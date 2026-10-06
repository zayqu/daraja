import { Suspense } from "react";
import { Poppins } from "next/font/google";
import "./globals.css";
import PrivacyControls from "@/components/PrivacyControls";
import SiteFooterLinks from "@/components/SiteFooterLinks";
import WebVitals from "@/components/WebVitals";
import TrafficTracker from "@/components/TrafficTracker";
import MobileDock from "@/components/ui/MobileDock";
import { candidateCareerEnabled, employerPortalEnabled } from "@/lib/features";
import { auth } from "@/auth";

const poppins = Poppins({
  variable: "--font-poppins",
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
  metadataBase: new URL("https://ajira.daraja.co.tz"),
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
  const adsenseClient = process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT;
  const analyticsId =
    process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID || "G-89Q157X930";
  const showEmployerCta = employerPortalEnabled();
  const showCandidateProfile = candidateCareerEnabled();
  const session = await auth();
  const userRole = session?.user?.role || null;
  const rootFontClass = `${poppins.variable} ${poppins.className}`;

  return (
    <html lang="en" className={rootFontClass}>
      <body className={poppins.className}>
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
        <PrivacyControls analyticsId={analyticsId} adsenseClient={adsenseClient} />
      </body>
    </html>
  );
}
