import { notFound, redirect } from "next/navigation";
import { employerPortalEnabled, getActor, isAdmin } from "@/lib/employer-access";
import styles from "../portal.module.css";

export const metadata = { title: "Moderation | Daraja" };

export default async function AdminPage() {
  if (!employerPortalEnabled()) notFound();
  const actor = await getActor();
  if (!actor) redirect("/auth/signin?callbackUrl=/admin");
  if (!isAdmin(actor)) notFound();
  return (
    <main className={styles.shell} id="main-content">
      <header className={styles.header}>
        <p className={styles.eyebrow}>Protected administration</p>
        <h1>Verification and vacancy moderation</h1>
        <p>Review employer evidence, publish suitable vacancies and retain a complete audit history.</p>
      </header>
      <section className={styles.card}>
        <h2>Moderation safeguards</h2>
        <ul>
          <li>Employer identity is verified before publication.</li>
          <li>Rejections require a reason.</li>
          <li>Every decision records the authenticated administrator.</li>
        </ul>
      </section>
    </main>
  );
}
