"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import { trackEvent } from "@/lib/analytics";

export default function JobDetailPageClient({ showEmployerCta }) {
  const { id } = useParams();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const fetchJob = useCallback(async function fetchJob() {
    try {
      const res = await fetch("/api/jobs/" + id);
      if (res.status === 404) { setNotFound(true); return; }
      const data = await res.json();
      setJob(data.job);
      trackEvent("view_item", { items: [{ item_id: data.job.id, item_name: data.job.title, item_brand: data.job.company, item_category: data.job.category }] });
    } catch (error) {
      console.error(error);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { if (id) queueMicrotask(fetchJob); }, [id, fetchJob]);

  function formatDate(d) {
    if (!d) return null;
    return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  }
  function isExpired(d) { return d && new Date(d) < new Date(); }
  function isExpiringSoon(d) { if (!d) return false; const days = (new Date(d) - new Date()) / 86400000; return days <= 7 && days > 0; }
  function daysLeft(d) { if (!d) return null; return Math.ceil((new Date(d) - new Date()) / 86400000); }
  function getDeadlineClass(d) { if (isExpired(d)) return "detail-value expired"; if (isExpiringSoon(d)) return "detail-value soon"; return "detail-value ok"; }
  function getShareMessage() {
    const deadline = job.deadline ? formatDate(job.deadline) : "Not specified";
    return ["📢 New Job Opportunity", "", `Position: ${job.title}`, `Organisation: ${job.company}`, `Location: ${job.location}`, `Category: ${job.category}`, `Deadline: ${deadline}`, "", `View details: ${window.location.href}`, "", "Follow Daraja Jobs on WhatsApp:", "https://whatsapp.com/channel/0029Vanw1OQ1CYoYdxl32g3V"].join("\n");
  }
  function getApplicationEmail() {
    if (!job?.sourceUrl?.startsWith("mailto:")) return "";
    try { return decodeURIComponent(job.sourceUrl.slice("mailto:".length).split("?")[0]); } catch { return ""; }
  }

  const applicationEmail = getApplicationEmail();
  const applicationSubject = applicationEmail ? new URL(job.sourceUrl).searchParams.get("subject") || "" : "";
  const applicationHref = applicationEmail ? job?.sourceUrl : job ? `/api/jobs/${encodeURIComponent(job.slug || job.id)}/apply` : "#";

  return <>
    <style>{`
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      .dr { font-family: inherit; background: #F7F8FA; min-height: 100vh; color: #1B2A3F; }
      .breadcrumb { background: #1B2A3F; padding: 0 3rem 1.25rem; }.breadcrumb-inner { max-width: 860px; margin: 0 auto; display:flex;align-items:center;gap:.5rem;font-size:.75rem;color:rgba(255,255,255,.35)}.breadcrumb a{color:rgba(255,255,255,.4);text-decoration:none}.breadcrumb-sep{color:rgba(255,255,255,.2)}
      .body{max-width:860px;margin:0 auto;padding:2.5rem 3rem 5rem;display:grid;grid-template-columns:minmax(0,1fr) 300px;grid-template-areas:"content apply" "content details" "content browse";gap:1rem 2rem;align-items:start}.main-column{grid-area:content}.application-card{grid-area:apply}.details-card{grid-area:details}.browse-card{grid-area:browse}.main-card,.side-card{background:#fff;border:1.5px solid #E8ECF0;border-radius:var(--radius-card)}.main-card{overflow:hidden}.card-header{padding:2rem 2rem 1.5rem;border-bottom:1px solid #F0F3F7}.job-title{font-size:1.4rem;font-weight:700;line-height:1.3;margin-bottom:.5rem}.job-company{font-size:.9rem;color:#6B7685;margin-bottom:1.25rem}.job-tags{display:flex;flex-wrap:wrap;gap:.4rem}.tag{font-size:.68rem;font-weight:500;padding:.25rem .75rem;border-radius:var(--radius-pill)}.t-cat{background:#E8FAF6;color:#0A8C74}.t-loc,.t-type{background:#F2F4F7;color:#6B7685}.t-feat{background:#FEF6E4;color:#92660A}.card-body{padding:1.75rem 2rem}.section-heading{font-size:.78rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#667085;margin-bottom:.85rem;margin-top:1.75rem}.section-heading:first-child{margin-top:0}.job-description{font-size:.875rem;color:#3D4B5C;line-height:1.8;white-space:pre-wrap}.side-card{padding:1.5rem}.side-card-title{font-size:.72rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#667085;margin-bottom:1.1rem}.detail-row{display:flex;flex-direction:column;gap:.85rem}.detail-item{display:flex;flex-direction:column;gap:.15rem}.detail-label{font-size:.68rem;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#A0ACBB}.detail-value{font-size:.82rem;color:#1B2A3F;font-weight:500}.detail-value.expired{color:#DC2626}.detail-value.soon{color:#D97706}.detail-value.ok{color:#0A8C74}.apply-btn{display:block;width:100%;padding:.9rem;background:#00C9A7;color:#1B2A3F;font-size:.85rem;font-weight:700;text-align:center;border-radius:var(--radius-button);text-decoration:none}.apply-btn-disabled{display:block;width:100%;padding:.9rem;background:#E8ECF0;color:#A0ACBB;font-size:.85rem;font-weight:700;text-align:center;border-radius:var(--radius-button)}.apply-note{font-size:.7rem;color:#A0ACBB;text-align:center;margin-top:.65rem;line-height:1.5}.share-btn{display:block;width:100%;min-height:46px;margin-top:.75rem;padding:.75rem;border:1.5px solid #25D366;border-radius:var(--radius-button);background:#fff;color:#167B3C;font-weight:700;font-size:.8rem;text-align:center;text-decoration:none}.back-link{display:inline-flex;font-size:.78rem;color:#6B7685;text-decoration:none;margin-bottom:1.5rem}.state{text-align:center;padding:5rem 3rem;max-width:860px;margin:0 auto}.state strong{font-size:1.1rem;display:block;margin-bottom:.5rem}.state p{font-size:.85rem;color:#8B95A1}
      @media(max-width:720px){.breadcrumb{padding:0 1.25rem 1rem}.body{grid-template-columns:minmax(0,1fr);grid-template-areas:"back" "header" "details" "about" "apply" "browse";gap:1rem;padding:1.5rem 1.25rem 4rem}.main-column,.main-card{display:contents}.main-column .back-link{grid-area:back;margin-bottom:0}.card-header{grid-area:header;background:#fff;border:1.5px solid #E8ECF0;border-radius:var(--radius-card);padding:1.5rem}.card-body{grid-area:about;background:#fff;border:1.5px solid #E8ECF0;border-radius:var(--radius-card);padding:1.5rem}.application-card{margin-top:.5rem}.job-description{font-size:1rem;line-height:1.75}}
    `}</style>
    <div className="dr"><SiteNav showSearch showEmployerCta={showEmployerCta}/><nav className="breadcrumb"><div className="breadcrumb-inner"><Link href="/">Home</Link><span className="breadcrumb-sep">›</span><Link href="/jobs">Jobs</Link><span className="breadcrumb-sep">›</span><span>{loading?"Loading...":job?job.title:"Not Found"}</span></div></nav>
    {loading&&<div className="state"><p>Loading position...</p></div>}
    {!loading&&notFound&&<div className="state"><strong>Position not found</strong><p>This job may have been removed or expired.</p><Link href="/jobs">Browse all jobs →</Link></div>}
    {!loading&&job&&<main className="body" id="main-content"><div className="main-column"><Link href="/jobs" className="back-link">← Back to Jobs</Link><div className="main-card"><div className="card-header"><h1 className="job-title">{job.title}</h1><div className="job-company">{job.company}</div><div className="job-tags"><span className="tag t-cat">{job.category}</span><span className="tag t-loc">{job.location}</span><span className="tag t-type">{job.type.replace("_"," ")}</span>{job.featured&&<span className="tag t-feat">Featured</span>}</div></div><div className="card-body"><h2 className="section-heading">About this position</h2><div className="job-description">{job.description}</div>{job.salary&&<><h2 className="section-heading">Salary</h2><div className="job-description">{job.salary}</div></>}</div></div></div>
    <section className="side-card details-card"><h2 className="side-card-title">Job Details</h2><div className="detail-row"><div className="detail-item"><div className="detail-label">Company</div><div className="detail-value">{job.company}</div></div><div className="detail-item"><div className="detail-label">Location</div><div className="detail-value">{job.location}</div></div><div className="detail-item"><div className="detail-label">Job Type</div><div className="detail-value">{job.type.replace("_"," ")}</div></div><div className="detail-item"><div className="detail-label">Category</div><div className="detail-value">{job.category}</div></div>{job.deadline&&<div className="detail-item"><div className="detail-label">Closing Date</div><div className={getDeadlineClass(job.deadline)}>{formatDate(job.deadline)} {!isExpired(job.deadline)&&daysLeft(job.deadline)!==null&&`(${daysLeft(job.deadline)} days left)`}{isExpired(job.deadline)&&"(Expired)"}</div></div>}<div className="detail-item"><div className="detail-label">Posted</div><div className="detail-value">{formatDate(job.createdAt)}</div></div></div></section>
    <section className="side-card application-card"><h2 className="side-card-title">Apply for this role</h2>{job.sourceUrl&&!isExpired(job.deadline)?<a href={applicationHref} target={applicationEmail?undefined:"_blank"} rel={applicationEmail?undefined:"noopener noreferrer"} className="apply-btn" onClick={()=>trackEvent("apply_job",{job_id:job.id,job_title:job.title,employer:job.company,category:job.category,application_method:applicationEmail?"email":"resolved_external",source:job.source})}>Apply Now →</a>:<div className="apply-btn-disabled">Applications Closed</div>}{job.source==="ajira"&&<p className="apply-note">Continue to the official Ajira sign-in/application step for this vacancy.</p>}{applicationEmail&&<p className="apply-note">Email: <a href={job.sourceUrl}>{applicationEmail}</a>{applicationSubject&&<> <br/>Subject: {applicationSubject}</>}</p>}<a className="share-btn" href={`https://wa.me/?text=${encodeURIComponent(getShareMessage())}`} target="_blank" rel="noopener noreferrer">Share on WhatsApp</a></section>
    <section className="side-card browse-card"><h2 className="side-card-title">Browse More</h2><div><Link href={"/jobs?category="+job.category}>More {job.category} jobs →</Link></div></section></main>}<SiteFooter/></div></>;
}
