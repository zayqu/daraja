"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./admin.module.css";

const TYPES = [
  ["RECRUITMENT_AGENCY", "Recruitment agency"],
  ["BANK", "Bank"],
  ["DIRECT_EMPLOYER", "Direct employer"],
];

async function send(method, payload) {
  const response = await fetch("/api/admin/distribution-campaigns", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "Unable to save campaign.");
  return result;
}

export default function DistributionCampaignManager({ employers, jobs, campaigns }) {
  const router = useRouter();
  const [employerId, setEmployerId] = useState("");
  const [jobId, setJobId] = useState("");
  const [vacancyTitle, setVacancyTitle] = useState("");
  const [destinationUrl, setDestinationUrl] = useState("");
  const [partnerType, setPartnerType] = useState("RECRUITMENT_AGENCY");
  const [destinationMode, setDestinationMode] = useState("PARTNER_DIRECT");
  const [approvalReference, setApprovalReference] = useState("");
  const [approved, setApproved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState("");
  const eligibleJobs = jobs.filter((job) => job.employerId === employerId);

  async function create(event) {
    event.preventDefault();
    setSaving(true); setErrors(""); setMessage("");
    try {
      const result = await send("POST", { employerId, jobId: destinationMode === "AJIRA_LANDING" ? jobId : null,
        vacancyTitle, destinationUrl, partnerType, partnerApproved: approved, destinationMode, approvalReference });
      setMessage(`Created campaign ${result.campaignKey}; no WhatsApp post has been sent.`);
      setJobId(""); setVacancyTitle(""); setDestinationUrl(""); setApproved(false); setApprovalReference("");
      router.refresh();
    } catch (error) {
      setErrors(error.message);
    } finally { setSaving(false); }
  }
  async function update(event, id) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      id,
      status: form.get("status"),
      whatsappPostUrl: form.get("whatsappPostUrl"),
      views24h: form.get("views24h") === "" ? null : Number(form.get("views24h")),
      views7d: form.get("views7d") === "" ? null : Number(form.get("views7d")),
      reportedApplications: form.get("reportedApplications") === "" ? null : Number(form.get("reportedApplications")),
      reportedInterviews: form.get("reportedInterviews") === "" ? null : Number(form.get("reportedInterviews")),
      reportedHires: form.get("reportedHires") === "" ? null : Number(form.get("reportedHires")),
    };
    setSaving(true); setErrors(""); setMessage("");
    try {
      await send("PATCH", payload);
      setMessage("Campaign measurements saved and audited.");
      router.refresh();
    } catch (error) {
      setErrors(error.message);
    } finally { setSaving(false); }
  }
  return (
    <>
      <form className={styles.settingForm} onSubmit={create}>
        <h2>Create a partner-approved campaign</h2>
        <p>Only verified partners can join. Agency vacancies can go directly to their official ATS without being republished on Ajira.</p>
        <label htmlFor="campaign-partner">Verified partner</label>
        <select className={styles.input} id="campaign-partner" required value={employerId}
          onChange={(event) => { setEmployerId(event.target.value); setJobId(""); }}>
          <option value="">Select a verified partner</option>
          {employers.map((employer) => <option key={employer.id} value={employer.id}>{employer.companyName}</option>)}
        </select>
        <label htmlFor="campaign-title">Approved vacancy title</label>
        <input className={styles.input} id="campaign-title" required minLength={5} maxLength={160}
          value={vacancyTitle} onChange={(event) => setVacancyTitle(event.target.value)} />
        <label htmlFor="campaign-url">Official partner application URL (https)</label>
        <input className={styles.input} id="campaign-url" type="url" required pattern="https://.*"
          maxLength={2000} value={destinationUrl} placeholder="https://agency.example/careers/role"
          onChange={(event) => setDestinationUrl(event.target.value)} />
        {destinationMode === "AJIRA_LANDING" ? (
          <>
            <label htmlFor="campaign-job">Partner-owned published Ajira vacancy</label>
            <select className={styles.input} id="campaign-job" required value={jobId} onChange={(event) => setJobId(event.target.value)}>
              <option value="">Select Ajira vacancy</option>
              {eligibleJobs.map((job) => <option key={job.id} value={job.id}>{job.title}</option>)}
            </select>
          </>
        ) : null}
        <label htmlFor="campaign-type">Partner type</label>
        <select className={styles.input} id="campaign-type" value={partnerType} onChange={(event) => setPartnerType(event.target.value)}>
          {TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <label htmlFor="destination-mode">Application journey</label>
        <select className={styles.input} id="destination-mode" value={destinationMode} onChange={(e) => setDestinationMode(e.target.value)}>
          <option value="PARTNER_DIRECT">Direct to partner website / ATS (no DARAJA website analytics)</option>
          <option value="AJIRA_LANDING">Ajira job details first (consented GA4 possible)</option>
        </select>
        <label htmlFor="campaign-reference">Partner approval reference (internal, no applicant data)</label>
        <input className={styles.input} id="campaign-reference" required minLength={10} maxLength={300}
          placeholder="Approved correspondence reference / date" value={approvalReference}
          onChange={(event) => setApprovalReference(event.target.value)}/>
        <label><input type="checkbox" checked={approved} onChange={(event) => setApproved(event.target.checked)} required/>
          {" "}The authorised partner approved this vacancy distribution and reporting.</label>
        <button className={styles.buttonPrimary} type="submit" disabled={saving || (destinationMode === "AJIRA_LANDING" && !eligibleJobs.length)}>
          Create draft campaign
        </button>
      </form>
      {message ? <p role="status">{message}</p> : null}
      {errors ? <p role="alert">{errors}</p> : null}
      <h2>Campaigns</h2>
      {campaigns.length ? campaigns.map((c) => (
        <form className={styles.settingForm} key={c.id} onSubmit={(event) => update(event, c.id)}>
          <h3>{c.employer.companyName} — {c.vacancyTitle}</h3>
          <p><strong>{c.campaignKey}</strong> · {c.partnerType.replaceAll("_", " ")}</p>
          <p>Application route: {c.destinationMode === "PARTNER_DIRECT" ? "Direct to partner website / ATS" : "Ajira job page"}</p>
          <p>Share only after actual publication: <code>{`https://ajira.daraja.co.tz/r/${c.campaignKey}`}</code></p>
          <p>
            {c.destinationMode === "PARTNER_DIRECT"
              ? "This redirect will count aggregate outbound requests and immediately forward candidates to the approved partner ATS. Draft campaigns are not accessible via this link."
              : "For an optional Ajira landing, use the existing tagged Ajira vacancy URL instead; the redirect counter does not measure Ajira landing visits."}
          </p>
          {c.destinationMode === "AJIRA_LANDING" && c.job ? <p>
            <code>{`https://ajira.daraja.co.tz/jobs/${c.job.slug}?utm_source=whatsapp&utm_medium=channel&utm_campaign=${c.campaignKey}`}</code>
          </p> : null}
          <p>Outbound redirect requests (not unique visitors or applications):
            <strong> {c.status === "DRAFT" ? "Unavailable before publication" : c.outboundRedirects.toLocaleString("en-GB")}</strong>
          </p>
          <label>Status <select className={styles.input} name="status" defaultValue={c.status}>
            <option value="DRAFT">Draft</option><option value="LIVE">Live (only after actual posting)</option><option value="CLOSED">Closed</option>
          </select></label>
          <label>Actual WhatsApp Channel post URL
            <input className={styles.input} type="url" name="whatsappPostUrl" defaultValue={c.whatsappPostUrl || ""} placeholder="https://whatsapp.com/channel/..." />
          </label>
          {[
            ["views24h", "Views at 24 hours (Channel insights)"],
            ["views7d", "Views at 7 days (Channel insights)"],
            ["reportedApplications", "Completed applications (partner-reported)"],
            ["reportedInterviews", "Interviews (partner-reported)"],
            ["reportedHires", "Hires (partner-reported)"],
          ].map(([key, label]) => (
            <label key={key}>{label}
              <input className={styles.input} name={key} type="number" min="0" max="100000000"
                defaultValue={c[key] ?? ""} placeholder="Unavailable until verified" />
            </label>
          ))}
          <button className={styles.buttonPrimary} disabled={saving}>Save verified report figures</button>
        </form>
      )) : <p>No pilot campaigns created yet.</p>}
    </>
  );
}
