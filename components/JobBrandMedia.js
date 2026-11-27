"use client";

import { useState } from "react";
import Image from "next/image";
import styles from "./JobBrandMedia.module.css";

function passthroughLoader({ src }) {
  return src;
}

const INITIAL_TONES = ["navy", "teal", "deep", "slate", "sky"];

// Employers without media get their own initials badge (e.g. "Pwani
// Microfinance" -> "PM") in a stable tone derived from the name.
export function employerInitials(company = "") {
  const words = String(company)
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((word) => word && !/^(the|of|and|ltd|limited|plc|co)$/i.test(word));
  if (words.length === 0) return "D";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function initialsTone(company = "") {
  let hash = 0;
  for (const char of String(company)) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return INITIAL_TONES[hash % INITIAL_TONES.length];
}

export default function JobBrandMedia({
  company,
  companyLogo,
  representativeImage,
  className = "",
  sizes = "56px",
}) {
  const [failed, setFailed] = useState(false);
  const source = companyLogo || representativeImage || "";
  const isLogo = Boolean(companyLogo);

  if (!source || failed) {
    return (
      <span
        className={`${styles.media} ${styles.initials} ${styles[initialsTone(company)]} ${className}`}
        aria-hidden="true"
      >
        {employerInitials(company)}
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
