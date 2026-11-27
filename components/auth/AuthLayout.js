import Image from "next/image";
import Link from "next/link";
import LanguageSwitch from "@/components/LanguageSwitch";
import DarajaLogo from "@/components/ui/DarajaLogo";
import styles from "@/app/auth/auth.module.css";
import { getServerT } from "@/lib/i18n-server";

const DEFAULT_POINTS = [
  "Vacancies from verified sources across Tanzania",
  "Free CV Builder made for ATS screening",
  "Job alerts by email and WhatsApp",
];

// Shared split frame for sign in, create account and password pages
// (Figma: Desktop · Sign in). Left: Daraja brand panel with real people;
// right: the form, with Privacy and Terms at the bottom.
export default async function AuthLayout({ points = DEFAULT_POINTS, children }) {
  const { t } = await getServerT();
  return (
    <div className={styles.page}>
      <aside className={styles.brandPanel}>
        <Link href="/" className={styles.brandLink} aria-label={t("Daraja home")}>
          <DarajaLogo tone="light" />
        </Link>

        <div className={styles.brandCopy}>
          <p className={styles.brandHeadline}>
            {t("Kazi na fursa,")}
            <span>{t("mfukoni mwako.")}</span>
          </p>
          <p className={styles.brandIntro}>
            {t("Verified vacancies from across Tanzania, a free ATS-ready CV, and alerts on WhatsApp.")}
          </p>
          <ul className={styles.brandPoints}>
            {points.map((point) => (
              <li key={point}>{t(point)}</li>
            ))}
          </ul>
        </div>

        <div className={styles.brandPhotos} aria-hidden="true">
          <Image src="/images/auth/woman-job-seeker.webp" alt="" width={1020} height={734} sizes="(max-width: 1100px) 0px, 240px" />
          <Image src="/images/auth/man-job-seeker.webp" alt="" width={1020} height={734} sizes="(max-width: 1100px) 0px, 240px" />
        </div>
      </aside>

      <main id="main-content" className={styles.formSide}>
        <div className={styles.formTop}>
          <Link href="/" className={styles.mobileLogo} aria-label={t("Daraja home")}>
            <DarajaLogo />
          </Link>
          <LanguageSwitch />
        </div>

        <div className={styles.formBody}>
          <div className={styles.mobileBrand} aria-hidden="true">
            <span className={styles.mobileFaces}>
              <Image src="/images/auth/woman-job-seeker.webp" alt="" width={1020} height={734} sizes="44px" />
              <Image src="/images/auth/man-job-seeker.webp" alt="" width={1020} height={734} sizes="44px" />
            </span>
            <span>
              {t("Kazi na fursa,")} <strong>{t("mfukoni mwako.")}</strong>
            </span>
          </div>
          {children}
        </div>

        <p className={styles.legal}>
          <Link href="/privacy">{t("Privacy")}</Link>
          <span aria-hidden="true">·</span>
          <Link href="/terms">{t("Terms")}</Link>
        </p>
      </main>
    </div>
  );
}
