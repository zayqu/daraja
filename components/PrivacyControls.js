"use client";

import Link from "next/link";
import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import {
  CONSENT_EVENT,
  CONSENT_STORAGE_KEY,
  isValidAdSenseClient,
  isValidGoogleAnalyticsId,
} from "@/lib/google-services";
import "./PrivacyControls.css";

function readConsent() {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(CONSENT_STORAGE_KEY);
  return value === "accepted" || value === "rejected" ? value : null;
}

function AnalyticsPageViews({ measurementId }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!window.gtag) return;
    const query = searchParams.toString();
    window.gtag("config", measurementId, {
      page_path: `${pathname}${query ? `?${query}` : ""}`,
    });
  }, [measurementId, pathname, searchParams]);

  return null;
}

export default function PrivacyControls({ analyticsId, adsenseClient }) {
  const [consent, setConsent] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const analyticsEnabled = isValidGoogleAnalyticsId(analyticsId);
  const adsEnabled = isValidAdSenseClient(adsenseClient);
  const servicesEnabled = analyticsEnabled || adsEnabled;

  useEffect(() => {
    const timer = window.setTimeout(() => setConsent(readConsent()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  function saveConsent(value) {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, value);
    setConsent(value);
    setIsOpen(false);
    window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: value }));
  }

  if (!servicesEnabled) return null;

  return (
    <>
      {consent === "accepted" && analyticsEnabled && (
        <>
          <Script
            id="google-analytics-library"
            strategy="afterInteractive"
            src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(analyticsId)}`}
          />
          <Script id="google-analytics-config" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              window.gtag = gtag;
              gtag('js', new Date());
              gtag('config', '${analyticsId}', { anonymize_ip: true });
            `}
          </Script>
          <Suspense fallback={null}>
            <AnalyticsPageViews measurementId={analyticsId} />
          </Suspense>
        </>
      )}

      {consent === "accepted" && adsEnabled && (
        <Script
          id="google-adsense"
          async
          strategy="afterInteractive"
          crossOrigin="anonymous"
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(adsenseClient)}`}
        />
      )}

      {(consent === null || isOpen) && (
        <section className="privacy-banner" aria-labelledby="privacy-title">
          <div>
            <h2 id="privacy-title">Your privacy choices</h2>
            <p>
              Daraja uses optional analytics to improve job discovery and optional
              advertising to support the service. You can accept or decline these
              services. Core job search and applications work either way.{" "}
              <Link href="/privacy">Read our privacy policy</Link>.
            </p>
          </div>
          <div className="privacy-actions">
            <button type="button" className="privacy-secondary" onClick={() => saveConsent("rejected")}>
              Decline optional services
            </button>
            <button type="button" className="privacy-primary" onClick={() => saveConsent("accepted")}>
              Accept and continue
            </button>
          </div>
        </section>
      )}

      {consent !== null && !isOpen && (
        <button type="button" className="privacy-settings" onClick={() => setIsOpen(true)}>
          Privacy choices
        </button>
      )}
    </>
  );
}
