"use client";

import { useState } from "react";
import Image from "next/image";
import styles from "./JobBrandMedia.module.css";

function passthroughLoader({ src }) {
  return src;
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
        aria-label="Daraja placeholder"
      >
        <Image
          fill
          sizes={sizes}
          src="/icon.png"
          alt=""
          aria-hidden="true"
        />
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
