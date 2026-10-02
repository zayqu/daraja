"use client";

import Link from "next/link";
import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import {
  CONSENT_EVENT,
  CONSENT_STORAGE_KEY,
  PRIVACY_SETTINGS_EVENT,
  isValidAdSenseClient,
  isValidGoogleAnalyticsId,
} from "@/lib/google-services";
import "./PrivacyControls.css";

function readConsent() {
  if (typeof window === "undefined") return null;

  try {
    const value = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    if (value === "accepted" || value === "rejected") return value;
  } catch {}

  const cookie = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${CONSENT_STORAGE_KEY}=`));
  const value = cookie?.split("=")[1];
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
  const [hasLoadedConsent, setHasLoadedConsent] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const analyticsEnabled = isValidGoogleAnalyticsId(analyticsId);
  const adsEnabled = isValidAdSenseClient(adsenseClient);
  const servicesEnabled = analyticsEnabled || adsEnabled;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setConsent(readConsent());
      setHasLoadedConsent(true);
    }, 0);

    function openPrivacySettings() {
      setIsOpen(true);
    }

    window.addEventListener(PRIVACY_SETTINGS_EVENT, openPrivacySettings);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(PRIVACY_SETTINGS_EVENT, openPrivacySettings);
    };
  }, []);

  function saveConsent(value) {
    try {
      window.localStorage.setItem(CONSENT_STORAGE_KEY, value);
    } catch {}

    document.cookie = `${CONSENT_STORAGE_KEY}=${value}; Max-Age=31536000; Path=/; Domain=.ajira.daraja.co.tz; SameSite=Lax; Secure`;
    if (typeof window.gtag === "function") {
      const permission = value === "accepted" ? "granted" : "denied";
      window.gtag("consent", "update", {
        ad_storage: permission,
        analytics_storage: permission,
        ad_user_data: permission,
        ad_personalization: permission,
      });
    }
    setConsent(value);
    setIsOpen(false);
    window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: value }));
  }

  if (!servicesEnabled) return null;

  return (
    <>
      <Script id="google-consent-default" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = window.gtag || gtag;
          gtag('consent', 'default', {
            ad_storage: 'denied',
            analytics_storage: 'denied',
            ad_user_data: 'denied',
            ad_personalization: 'denied',
            wait_for_update: 500
          });
        `}
      </Script>

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
              gtag('consent', 'update', {
                ad_storage: 'granted',
                analytics_storage: 'granted',
                ad_user_data: 'granted',
                ad_personalization: 'granted'
              });
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

      {hasLoadedConsent && (consent === null || isOpen) && (
        <section className="privacy-banner" aria-labelledby="privacy-title">
          <div className="privacy-copy">
            <h2 id="privacy-title">Privacy choices</h2>
            <p>
              Optional analytics and ads help us improve Daraja. Job search and
              applications work either way. <Link href="/privacy">Privacy policy</Link>.
            </p>
          </div>
          <div className="privacy-actions">
            <button type="button" className="privacy-secondary" onClick={() => saveConsent("rejected")}>
              Decline
            </button>
            <button type="button" className="privacy-primary" onClick={() => saveConsent("accepted")}>
              Accept
            </button>
          </div>
        </section>
      )}
    </>
  );
}
