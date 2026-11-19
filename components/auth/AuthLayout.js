import Link from "next/link";
import PublicSiteNav from "@/components/PublicSiteNav";
import SurfaceCard from "@/components/ui/SurfaceCard";
import styles from "@/app/auth/auth.module.css";
import { getServerT } from "@/lib/i18n-server";

const DEFAULT_POINTS = [
  "Browse and apply for jobs without an account",
  "Save jobs and get alerts for the roles you want",
  "Employers post vacancies after a quick verification",
];

// Shared two-column frame for sign in, create account and password pages.
// Pages pass English text; it is translated here.
export default async function AuthLayout({ title, intro, points = DEFAULT_POINTS, children }) {
  const { t } = await getServerT();
  return (
    <div className={styles.page}>
      <PublicSiteNav />
      <main id="main-content" className={styles.authMain}>
        <SurfaceCard className={styles.split}>
          <aside className={styles.aside}>
            <div>
              <Link href="/" className={styles.brand}>DARAJA</Link>
              <h1>{t(title)}</h1>
              <p>{t(intro)}</p>
            </div>
            <ul className={styles.asideList}>
              {points.map((point) => (
                <li key={point}>{t(point)}</li>
              ))}
            </ul>
          </aside>
          <section className={styles.panel}>{children}</section>
        </SurfaceCard>
      </main>
    </div>
  );
}
