"use client";

import { useState } from "react";
import Image from "next/image";
import styles from "./JobBrandMedia.module.css";

function passthroughLoader({ src }) {
  return src;
}

function initialsFor(company) {
  return String(company || "Daraja")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export default function JobBrandMedia({
  company,
  companyLogo,
  representativeImage,
  sourceType = "",
  className = "",
  sizes = "56px",
}) {
  const [failed, setFailed] = useState(false);
  const source = companyLogo || representativeImage || "";
  const isLogo = Boolean(companyLogo);

  if (!source || failed) {
    if (sourceType === "ajira") {
      return (
        <span
          className={`${styles.media} ${styles.governmentPlaceholder} ${className}`}
          aria-label="Government vacancy source"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M3 10h18M5 10V20M9 10V20M15 10V20M19 10V20M3 20h18M4 7l8-4 8 4v3H4V7Z" />
          </svg>
        </span>
      );
    }

    return (
      <span
        className={`${styles.media} ${styles.placeholder} ${className}`}
        aria-hidden="true"
      >
        {initialsFor(company)}
      </span>
    );
  }

  return (
    <span
      className={`${styles.media} ${isLogo ? styles.logo : styles.photo} ${className}`}
    >
      <Image
        loader={passthroughLoader}
        unoptimized
        fill
        sizes={sizes}
        src={source}
        alt={isLogo ? `${company} logo` : `${company} representative image`}
        onError={() => setFailed(true)}
      />
    </span>
  );
}
