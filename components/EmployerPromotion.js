"use client";

import { useEffect, useState } from "react";

// Values are AzamPay's official MNO provider names.
const NETWORKS = [
  { value: "Mpesa", label: "M-Pesa (Vodacom)" },
  { value: "Airtel", label: "Airtel Money" },
  { value: "Tigo", label: "Mixx by Yas (Tigo Pesa)" },
  { value: "Halopesa", label: "HaloPesa (Halotel)" },
  { value: "Azampesa", label: "AzamPesa" },
];
const POLL_MS = 5000;
const POLL_LIMIT = 36; // about three minutes

// 0712 345 678, 712345678, +255 712 345 678 -> 255712345678 (shown before sending).
export function tanzaniaMobileNumber(value) {
  const digits = String(value || "").replace(/[\s()-]/g, "").replace(/^\+/, "");
  if (/^255[67]\d{8}$/.test(digits)) return digits;
  if (/^0[67]\d{8}$/.test(digits)) return `255${digits.slice(1)}`;
  if (/^[67]\d{8}$/.test(digits)) return `255${digits}`;
  return null;
}

function tzs(amount) {
  return `TZS ${Number(amount).toLocaleString("en-GB")}`;
}

export default function EmployerPromotion({ jobId, initialBooking = null, offer, featuredUntilLabel = "" }) {
  const [booking, setBooking] = useState(initialBooking);
  const [phone, setPhone] = useState("");
  const [network, setNetwork] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [checks, setChecks] = useState(0);
  const waiting = booking?.status === "APPROVED" && booking.payment === "WAITING";

  // While the phone prompt is open, ask Daraja for the result every 5 seconds.
  useEffect(() => {
    if (!waiting || checks >= POLL_LIMIT) return undefined;
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/employer/promotions/${booking.id}`, { cache: "no-store" });
        const payload = await response.json().catch(() => ({}));
        if (response.ok && payload.booking) setBooking(payload.booking);
      } catch {
        // Network blip: the next check tries again.
      }
      setChecks((count) => count + 1);
    }, POLL_MS);
    return () => clearTimeout(timer);
  }, [waiting, checks, booking?.id]);

  async function send(url, body) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return { response, payload: await response.json().catch(() => ({})) };
    } catch {
      return { response: null, payload: {} };
    } finally {
      setBusy(false);
    }
  }

  async function requestFeature() {
    const { response, payload } = await send("/api/employer/promotions", { jobId });
    if (response?.ok && payload.booking) setBooking(payload.booking);
    else setError(payload.error || "The request could not be sent. Please try again.");
  }

  async function pay(event) {
    event.preventDefault();
    const accountNumber = tanzaniaMobileNumber(phone);
    if (!accountNumber) {
      setError("Enter a Tanzanian mobile number, for example 0712 345 678.");
      return;
    }
    if (!network) {
      setError("Choose your mobile money network.");
      return;
    }
    const { response, payload } = await send("/api/payments/azampay/sandbox/checkout", {
      bookingId: booking.id, accountNumber, provider: network,
    });
    if (response?.status === 202) {
      setChecks(0);
      setBooking((current) => ({ ...current, payment: "WAITING" }));
    } else if (payload.status === "UNKNOWN") {
      setBooking((current) => ({ ...current, payment: "UNKNOWN" }));
    } else {
      setError(payload.error || "The payment could not be started. Please try again.");
    }
  }

  const amount = tzs(booking?.amountTzs ?? offer.priceTzs);
  const days = booking?.featuredDays ?? offer.featuredDays;
  const canRequest = !booking || ["REJECTED", "CANCELLED"].includes(booking.status) ||
    (booking.status === "FULFILLED" && !featuredUntilLabel);
  const canPay = booking?.status === "APPROVED" && ["NONE", "FAILED"].includes(booking.payment);
  const normalized = tanzaniaMobileNumber(phone);

  let note = null;
  if (booking?.status === "PENDING_REVIEW") note = "Request sent. Daraja will review it shortly, then you can pay here.";
  if (booking?.status === "REJECTED") note = "Your last request was not approved. Contact Daraja if you need help.";
  if (booking?.status === "APPROVED" && booking.payment === "FAILED") note = "The last payment did not go through. Nothing was charged. You can try again.";
  if (waiting) {
    note = checks >= POLL_LIMIT
      ? "Still waiting for your phone. If you approved the payment, refresh this page in a minute."
      : `Check your phone and enter your PIN to approve ${amount}. This page updates by itself.`;
  }
  if (booking?.status === "APPROVED" && booking.payment === "STALLED") note = "We have not heard back about this payment. If money left your account, contact Daraja. Otherwise ask Daraja to reset it so you can pay again.";
  if (booking?.status === "APPROVED" && booking.payment === "UNKNOWN") note = "We could not confirm this payment. Please contact Daraja before trying again, so you are not charged twice.";
  if (booking?.status === "PAID") note = "Paid. Thank you! Daraja will feature this vacancy and post it on the WhatsApp Channel shortly.";
  if (booking?.status === "FULFILLED" && featuredUntilLabel) note = `Featured until ${featuredUntilLabel}.`;

  return (
    <div className="portal-promotion">
      {note ? <p className={`portal-message ${booking?.status === "PAID" || booking?.status === "FULFILLED" ? "success" : "info"}`} role="status">{note}</p> : null}

      {canRequest ? (
        <button type="button" className="portal-submit" disabled={busy} onClick={requestFeature}>
          {busy ? "Sending…" : `Feature this vacancy · ${amount} for ${days} days`}
        </button>
      ) : null}

      {canPay ? (
        <form className="portal-form" onSubmit={pay}>
          <div className="portal-field">
            <label htmlFor={`pay-phone-${jobId}`}>Mobile money number</label>
            <input
              id={`pay-phone-${jobId}`}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="0712 345 678"
              maxLength={20}
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
            {normalized ? <small>The payment request goes to +{normalized}.</small> : null}
          </div>
          <div className="portal-field">
            <label htmlFor={`pay-network-${jobId}`}>Network</label>
            <select id={`pay-network-${jobId}`} value={network} onChange={(event) => setNetwork(event.target.value)}>
              <option value="">Choose your network</option>
              {NETWORKS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </div>
          <button className="portal-submit" type="submit" disabled={busy}>
            {busy ? "Sending request…" : `Pay ${amount} with mobile money`}
          </button>
        </form>
      ) : null}

      {error ? <p className="portal-message error" role="alert">{error}</p> : null}
    </div>
  );
}
