import { notFound, redirect } from "next/navigation";
import { activePlanForUser, getBillingUser, invoicesForUser } from "@/lib/billing-access";
import { billingEnabled } from "@/lib/entitlements";
import styles from "../../portal.module.css";

export const metadata = { title: "Plan and billing | Daraja" };
export const dynamic = "force-dynamic";

const money = new Intl.NumberFormat("en-TZ", {
  style: "currency",
  currency: "TZS",
  maximumFractionDigits: 0,
});

export default async function BillingPage() {
  if (!billingEnabled()) notFound();
  const user = await getBillingUser();
  if (!user) redirect("/auth/signin?callbackUrl=/account/billing");
  const [entitlement, invoices] = await Promise.all([
    activePlanForUser(user),
    invoicesForUser(user.id),
  ]);

  return (
    <main className={styles.shell} id="main-content">
      <header className={styles.header}>
        <p className={styles.eyebrow}>Account plan</p>
        <h1>Clear limits. No surprise charges.</h1>
        <p>Review your plan and sandbox invoices. Live payment processing is unavailable.</p>
      </header>
      <section className={styles.grid} aria-label="Plan and billing summary">
        <article className={styles.card}>
          <h2>Current plan</h2>
          <p><strong>{entitlement.plan.replaceAll("_", " ")}</strong></p>
          <ul>
            <li>{entitlement.limits.activeVacancies} active employer vacancies</li>
            <li>{entitlement.limits.savedJobs} saved jobs</li>
            <li>{entitlement.limits.candidateSearches} candidate searches</li>
          </ul>
        </article>
        <article className={styles.card}>
          <h2>Invoices</h2>
          {invoices.length === 0 ? (
            <p>No invoices yet.</p>
          ) : (
            <ul>
              {invoices.map((invoice) => (
                <li key={invoice.id}>
                  {invoice.number}: {money.format(invoice.amountMinor / 100)} ({invoice.status.toLowerCase()})
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>
    </main>
  );
}
