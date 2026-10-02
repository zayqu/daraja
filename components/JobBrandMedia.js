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
  className = "",
  sizes = "56px",
}) {
  const [failed, setFailed] = useState(false);
  const source = companyLogo || representativeImage || "";
  const isLogo = Boolean(companyLogo);

  if (!source || failed) {
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
