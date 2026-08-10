import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { candidateCareerEnabled, getCandidateUser } from "@/lib/candidate-access";
import PublicSiteNav from "@/components/PublicSiteNav";
import styles from "./career.module.css";

export const metadata = { title: "Career workspace | Daraja" };
export const dynamic = "force-dynamic";

export default async function CareerPage() {
  if (!candidateCareerEnabled()) notFound();
  const user = await getCandidateUser();
  if (!user) redirect("/auth/signin?callbackUrl=/account/career");
  return (
    <>
      <PublicSiteNav />
      <main className={styles.shell} id="main-content">
        <header className={styles.header}>
          <p>Candidate workspace</p>
          <h1>Keep your job search organised</h1>
          <span>Build one reusable profile, save suitable vacancies and track Daraja applications securely.</span>
        </header>
        <section className={styles.grid} aria-label="Career tools">
          <article className={styles.card}>
            <h2>Candidate profile</h2>
            <p>Maintain your professional headline, preferences and secure HTTPS document references.</p>
          </article>
          <article className={styles.card}>
            <h2>Saved jobs</h2>
            <p>Keep vacancies together without changing their official application destination.</p>
            <Link href="/jobs">Browse vacancies</Link>
          </article>
          <article className={styles.card}>
            <h2>Applications</h2>
            <p>Track submitted, reviewed, shortlisted, offered, rejected or withdrawn applications.</p>
          </article>
        </section>
      </main>
    </>
  );
}
