"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function JobDetailPage() {
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
    } catch (error) {
      console.error(error);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) fetchJob();
  }, [id, fetchJob]);

  function formatDate(d) {
    if (!d) return null;
    return new Date(d).toLocaleDateString("en-GB", {
      day: "numeric", month: "long", year: "numeric",
    });
  }

  function isExpired(d) { return d && new Date(d) < new Date(); }

  function isExpiringSoon(d) {
    if (!d) return false;
    const days = (new Date(d) - new Date()) / 86400000;
    return days <= 7 && days > 0;
  }

  function daysLeft(d) {
    if (!d) return null;
    return Math.ceil((new Date(d) - new Date()) / 86400000);
  }

  function getDeadlineClass(d) {
    if (isExpired(d)) return "detail-value expired";
    if (isExpiringSoon(d)) return "detail-value soon";
    return "detail-value ok";
  }

  function getShareMessage() {
    const deadline = job.deadline ? formatDate(job.deadline) : "Not specified";
    return [
      "📢 New Job Opportunity",
      "",
      `Position: ${job.title}`,
      `Organisation: ${job.company}`,
      `Location: ${job.location}`,
      `Category: ${job.category}`,
      `Deadline: ${deadline}`,
      "",
      `View details: ${window.location.href}`,
      "",
      "Follow Daraja Jobs on WhatsApp:",
      "https://whatsapp.com/channel/0029Vanw1OQ1CYoYdxl32g3V",
    ].join("\n");
  }

  function getApplicationEmail() {
    if (!job?.sourceUrl?.startsWith("mailto:")) return "";
    try {
      return decodeURIComponent(
        job.sourceUrl.slice("mailto:".length).split("?")[0]
      );
    } catch {
      return "";
    }
  }

  const applicationEmail = getApplicationEmail();
  const applicationSubject = applicationEmail
    ? new URL(job.sourceUrl).searchParams.get("subject") || ""
    : "";

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .dr { font-family: inherit; background: #F7F8FA; min-height: 100vh; color: #1B2A3F; }

        .nav { background: #1B2A3F; height: 64px; padding: 0 3rem; display: flex; align-items: center; justify-content: space-between; }
        .nav-logo { font-family: inherit; font-size: 1.4rem; font-weight: 700; color: #00C9A7; letter-spacing: 0.1em; text-decoration: none; }
        .nav-logo span { display: block; font-size: 0.55rem; font-weight: 400; color: rgba(255,255,255,0.35); letter-spacing: 0.3em; text-transform: uppercase; margin-top: 1px; }
        .nav-cta { font-family: inherit; font-size: 0.78rem; font-weight: 600; background: #00C9A7; color: #1B2A3F; padding: 0.55rem 1.4rem; border-radius: 4px; text-decoration: none; transition: opacity 0.2s; }
        .nav-cta:hover { opacity: 0.88; }

        .breadcrumb { background: #1B2A3F; padding: 0 3rem 1.25rem; }
        .breadcrumb-inner { max-width: 860px; margin: 0 auto; display: flex; align-items: center; gap: 0.5rem; font-size: 0.75rem; color: rgba(255,255,255,0.35); }
        .breadcrumb a { color: rgba(255,255,255,0.4); text-decoration: none; transition: color 0.15s; }
        .breadcrumb a:hover { color: #00C9A7; }
        .breadcrumb-sep { color: rgba(255,255,255,0.2); }

        .body { max-width: 860px; margin: 0 auto; padding: 2.5rem 3rem 5rem; display: grid; grid-template-columns: minmax(0, 1fr) 300px; grid-template-areas: "content apply" "content details" "content browse"; gap: 1rem 2rem; align-items: start; }
        .main-column { grid-area: content; }
        .application-card { grid-area: apply; }
        .details-card { grid-area: details; }
        .browse-card { grid-area: browse; }

        .main-card { background: #fff; border: 1.5px solid #E8ECF0; border-radius: 8px; overflow: hidden; }
        .card-header { padding: 2rem 2rem 1.5rem; border-bottom: 1px solid #F0F3F7; }
        .job-title { font-family: inherit; font-size: 1.4rem; font-weight: 700; color: #1B2A3F; line-height: 1.3; margin-bottom: 0.5rem; letter-spacing: -0.01em; }
        .job-company { font-size: 0.9rem; color: #6B7685; font-weight: 400; margin-bottom: 1.25rem; }
        .job-tags { display: flex; flex-wrap: wrap; gap: 0.4rem; }
        .tag { font-size: 0.68rem; font-weight: 500; padding: 0.25rem 0.7rem; border-radius: 3px; letter-spacing: 0.03em; }
        .t-cat { background: #E8FAF6; color: #0A8C74; }
        .t-loc { background: #F2F4F7; color: #6B7685; }
        .t-type { background: #F2F4F7; color: #6B7685; }
        .t-feat { background: #FEF6E4; color: #92660A; }

        .card-body { padding: 1.75rem 2rem; }
        .section-heading { font-family: inherit; font-size: 0.78rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #667085; margin-bottom: 0.85rem; margin-top: 1.75rem; }
        .section-heading:first-child { margin-top: 0; }
        .job-description { font-size: 0.875rem; color: #3D4B5C; line-height: 1.8; white-space: pre-wrap; }

        .side-card { background: #fff; border: 1.5px solid #E8ECF0; border-radius: 8px; padding: 1.5rem; }
        .side-card-title { font-family: inherit; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #667085; margin-bottom: 1.1rem; }

        .detail-row { display: flex; flex-direction: column; gap: 0.85rem; }
        .detail-item { display: flex; flex-direction: column; gap: 0.15rem; }
        .detail-label { font-size: 0.68rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #A0ACBB; }
        .detail-value { font-size: 0.82rem; color: #1B2A3F; font-weight: 500; }
        .detail-value.expired { color: #DC2626; }
        .detail-value.soon { color: #D97706; }
        .detail-value.ok { color: #0A8C74; }

        .apply-btn { display: block; width: 100%; padding: 0.9rem; background: #00C9A7; color: #1B2A3F; font-family: inherit; font-size: 0.85rem; font-weight: 700; text-align: center; border-radius: 6px; text-decoration: none; letter-spacing: 0.04em; transition: opacity 0.2s; }
        .apply-btn:hover { opacity: 0.88; }
        .apply-btn-disabled { display: block; width: 100%; padding: 0.9rem; background: #E8ECF0; color: #A0ACBB; font-family: inherit; font-size: 0.85rem; font-weight: 700; text-align: center; border-radius: 6px; letter-spacing: 0.04em; cursor: not-allowed; }
        .apply-note { font-size: 0.7rem; color: #A0ACBB; text-align: center; margin-top: 0.65rem; line-height: 1.5; }
        .share-btn { display: block; width: 100%; min-height: 46px; margin-top: 0.75rem; padding: 0.75rem; border: 1.5px solid #25D366; border-radius: 6px; background: #fff; color: #167B3C; font: 700 0.8rem 'Poppins', sans-serif; text-align: center; text-decoration: none; cursor: pointer; }
        .share-btn:hover { background: #F0FFF5; }

        .back-link { display: inline-flex; align-items: center; gap: 0.4rem; font-size: 0.78rem; color: #6B7685; text-decoration: none; margin-bottom: 1.5rem; transition: color 0.15s; }
        .back-link:hover { color: #00C9A7; }
        .back-link:focus-visible, .nav-logo:focus-visible, .nav-cta:focus-visible, .apply-btn:focus-visible, .share-btn:focus-visible, .breadcrumb a:focus-visible { outline: 3px solid #F59E0B; outline-offset: 3px; }

        .state { text-align: center; padding: 5rem 3rem; max-width: 860px; margin: 0 auto; }
        .state strong { font-family: inherit; font-size: 1.1rem; color: #1B2A3F; display: block; margin-bottom: 0.5rem; }
        .state p { font-size: 0.85rem; color: #8B95A1; }

        .footer { background: #1B2A3F; border-top: 1px solid rgba(255,255,255,0.06); padding: 2rem 3rem; }
        .footer-inner { max-width: 860px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; }
        .footer-logo { font-family: inherit; font-size: 1rem; font-weight: 700; color: #00C9A7; letter-spacing: 0.12em; }
        .footer-sub { font-size: 0.6rem; color: rgba(255,255,255,0.25); letter-spacing: 0.25em; text-transform: uppercase; margin-top: 0.2rem; }
        .footer-copy { font-size: 0.72rem; color: rgba(255,255,255,0.25); }

        @media (max-width: 720px) {
          .nav { padding: 0 1.25rem; }
          .breadcrumb { padding: 0 1.25rem 1rem; }
          .body { grid-template-columns: minmax(0, 1fr); grid-template-areas: "back" "header" "details" "about" "apply" "browse"; gap: 1rem; padding: 1.5rem 1.25rem 4rem; }
          .main-column, .main-card { display: contents; }
          .main-column .back-link { grid-area: back; margin-bottom: 0; }
          .card-header { grid-area: header; background: #fff; border: 1.5px solid #E8ECF0; border-radius: 8px; padding: 1.5rem; }
          .card-body { grid-area: about; background: #fff; border: 1.5px solid #E8ECF0; border-radius: 8px; padding: 1.5rem; }
          .application-card { margin-top: 0.5rem; }
          .job-description { font-size: 1rem; line-height: 1.75; }
          .footer { padding: 2rem 1.25rem; }
          .footer-inner { flex-direction: column; gap: 1rem; text-align: center; }
        }
      `}</style>

      <div className="dr">
        <nav className="nav">
          <Link href="/" className="nav-logo">
            DARAJA
            <span>Kazi Na Fursa Tanzania</span>
          </Link>
          <Link href="/post-job" className="nav-cta">Post a Job</Link>
        </nav>

        <nav className="breadcrumb" aria-label="Breadcrumb">
          <div className="breadcrumb-inner">
            <Link href="/">Home</Link>
            <span className="breadcrumb-sep">›</span>
            <Link href="/jobs">Jobs</Link>
            <span className="breadcrumb-sep">›</span>
            <span>{loading ? "Loading..." : job ? job.title : "Not Found"}</span>
          </div>
        </nav>

        {loading && (
          <div className="state">
            <p style={{ color: "#8B95A1", fontSize: "0.85rem" }}>Loading position...</p>
          </div>
        )}

        {!loading && notFound && (
          <div className="state">
            <strong>Position not found</strong>
            <p>This job may have been removed or expired.</p>
            <Link href="/jobs" style={{ display: "inline-block", marginTop: "1.25rem", fontSize: "0.82rem", color: "#00C9A7", textDecoration: "none", fontWeight: 600 }}>
              Browse all jobs →
            </Link>
          </div>
        )}

        {!loading && job && (
          <main className="body" id="main-content">
            <div className="main-column">
              <Link href="/jobs" className="back-link">← Back to Jobs</Link>
              <div className="main-card">
                <div className="card-header">
                  <h1 className="job-title">{job.title}</h1>
                  <div className="job-company">{job.company}</div>
                  <div className="job-tags">
                    <span className="tag t-cat">{job.category}</span>
                    <span className="tag t-loc">{job.location}</span>
                    <span className="tag t-type">{job.type.replace("_", " ")}</span>
                    {job.featured && <span className="tag t-feat">Featured</span>}
                  </div>
                </div>
                <div className="card-body">
                  <h2 className="section-heading">About this position</h2>
                  <div className="job-description">{job.description}</div>
                  {job.salary && (
                    <>
                      <h2 className="section-heading">Salary</h2>
                      <div className="job-description">{job.salary}</div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <section className="side-card details-card" aria-labelledby="job-details-heading">
              <h2 className="side-card-title" id="job-details-heading">Job Details</h2>
              <div className="detail-row">
                  <div className="detail-item">
                    <div className="detail-label">Company</div>
                    <div className="detail-value">{job.company}</div>
                  </div>
                  <div className="detail-item">
                    <div className="detail-label">Location</div>
                    <div className="detail-value">{job.location}</div>
                  </div>
                  <div className="detail-item">
                    <div className="detail-label">Job Type</div>
                    <div className="detail-value">{job.type.replace("_", " ")}</div>
                  </div>
                  <div className="detail-item">
                    <div className="detail-label">Category</div>
                    <div className="detail-value">{job.category}</div>
                  </div>
                  {job.deadline && (
                    <div className="detail-item">
                      <div className="detail-label">Closing Date</div>
                      <div className={getDeadlineClass(job.deadline)}>
                        {formatDate(job.deadline)}
                        {!isExpired(job.deadline) && daysLeft(job.deadline) !== null && (
                          <span style={{ fontWeight: 400, fontSize: "0.72rem", marginLeft: "0.4rem" }}>
                            ({daysLeft(job.deadline)} days left)
                          </span>
                        )}
                        {isExpired(job.deadline) && (
                          <span style={{ fontWeight: 400, fontSize: "0.72rem", marginLeft: "0.4rem" }}>
                            (Expired)
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="detail-item">
                    <div className="detail-label">Posted</div>
                    <div className="detail-value">{formatDate(job.createdAt)}</div>
                  </div>
              </div>
            </section>

            <section className="side-card application-card" aria-labelledby="apply-heading">
              <h2 className="side-card-title" id="apply-heading">Apply for this role</h2>
              {job.sourceUrl && !isExpired(job.deadline) ? (
                <a
                  href={job.sourceUrl}
                  target={applicationEmail ? undefined : "_blank"}
                  rel={applicationEmail ? undefined : "noopener noreferrer"}
                  className="apply-btn"
                >
                  Apply Now →
                </a>
              ) : (
                <div className="apply-btn-disabled">Applications Closed</div>
              )}
              {job.source === "ajira" && (
                <p className="apply-note">
                  Continue on the official Ajira page to sign in and apply for this vacancy.
                </p>
              )}
              {applicationEmail && (
                <p className="apply-note">
                  The recipient, subject and message are prepared. Personalize the highlighted
                  details and attach your documents.
                  <br />
                  Email: <a href={job.sourceUrl}>{applicationEmail}</a>
                  {applicationSubject && (
                    <>
                      <br />
                      Subject: {applicationSubject}
                    </>
                  )}
                </p>
              )}
              <a
                className="share-btn"
                href={`https://wa.me/?text=${encodeURIComponent(getShareMessage())}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Share on WhatsApp
              </a>
            </section>

            <section className="side-card browse-card" aria-labelledby="browse-more-heading">
              <h2 className="side-card-title" id="browse-more-heading">Browse More</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <Link href={"/jobs?category=" + job.category} style={{ fontSize: "0.8rem", color: "#00C9A7", textDecoration: "none", fontWeight: 500 }}>
                  More {job.category} jobs →
                </Link>
                <Link href="/jobs" style={{ fontSize: "0.8rem", color: "#6B7685", textDecoration: "none" }}>
                  View all positions →
                </Link>
              </div>
            </section>
          </main>
        )}

        <footer className="footer">
          <div className="footer-inner">
            <div>
              <div className="footer-logo">DARAJA</div>
              <div className="footer-sub">Kazi Na Fursa Tanzania</div>
            </div>
            <div className="footer-copy">{new Date().getFullYear()} Daraja. All rights reserved.</div>
          </div>
        </footer>
      </div>
    </>
  );
}
