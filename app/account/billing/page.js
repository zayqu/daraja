import { notFound, redirect } from "next/navigation";
import { getBillingUser } from "@/lib/billing-access";
import { billingEnabled } from "@/lib/entitlements";
import styles from "./billing.module.css";
export const metadata = { title: "Plan and billing | Daraja" };
export default async function BillingPage() {
  if (!billingEnabled()) notFound();
  const user = await getBillingUser();
  if (!user) redirect("/auth/signin?callbackUrl=/account/billing");
  return <main className={styles.shell} id="main-content">
    <header><p className={styles.eyebrow}>Account plan</p><h1>Clear limits. No surprise charges.</h1><span>Review your plan, usage and invoices. Live payments remain unavailable until a verified provider is approved.</span></header>
    <section className={styles.grid}><article><h2>Free</h2><p>Core job discovery and limited protected tools.</p></article><article><h2>Employer Basic</h2><p>Up to five active vacancies with transparent review.</p></article><article><h2>Employer Pro</h2><p>Higher vacancy limits and controlled recruitment tools.</p></article></section>
  </main>;
}
