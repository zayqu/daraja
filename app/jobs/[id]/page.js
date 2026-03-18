"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function JobDetailPage() {
  const { id } = useParams();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (id) fetchJob();
  }, [id]);

  async function fetchJob() {
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
  }

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

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&family=Poppins:wght@300;400;500;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .dr { font-family: 'Poppins', sans-serif; background: #F7F8FA; min-height: 100vh; color: #1B2A3F; }

        .nav { background: #1B2A3F; height: 64px; padding: 0 3rem; display: flex; align-items: center; justify-content: space-between; }
        .nav-logo { font-family: 'Montserrat', sans-serif; font-size: 1.4rem; font-weight: 700; color: #00C9A7; letter-spacing: 0.1em; text-decoration: none; }
        .nav-logo span { display: block; font-size: 0.55rem; font-weight: 400; color: rgba(255,255,255,0.35); letter-spacing: 0.3em; text-transform: uppercase; margin-top: 1px; }
        .nav-cta { font-family: 'Poppins', sans-serif; font-size: 0.78rem; font-weight: 600; background: #00C9A7; color: #1B2A3F; padding: 0.55rem 1.4rem; border-radius: 4px; text-decoration: none; transition: opacity 0.2s; }
        .nav-cta:hover { opacity: 0.88; }

        .breadcrumb { background: #1B2A3F; padding: 0 3rem 1.25rem; }
        .breadcrumb-inner { max-width: 860px; margin: 0 auto; display: flex; align-items: center; gap: 0.5rem; font-size: 0.75rem; color: rgba(255,255,255,0.35); }
        .breadcrumb a { color: rgba(255,255,255,0.4); text-decoration: none; transition: color 0.15s; }
        .breadcrumb a:hover { color: #00C9A7; }
        .breadcrumb-sep { color: rgba(255,255,255,0.2); }

        .body { max-width: 860px; margin: 0 auto; padding: 2.5rem 3rem 5rem; display: grid; grid-template-columns: 1fr 300px; gap: 2rem; align-items: start; }

        .main-card { background: #fff; border: 1.5px solid #E8ECF0; border-radius: 8px; overflow: hidden; }
        .card-header { padding: 2rem 2rem 1.5rem; border-bottom: 1px solid #F0F3F7; }
        .job-source { font-size: 0.65rem; font-weight: 600; letter-spacing: 0.18em; text-transform: uppercase; color: #00C9A7; margin-bottom: 0.6rem; }
        .job-title { font-family: 'Montserrat', sans-serif; font-size: 1.4rem; font-weight: 700; color: #1B2A3F; line-height: 1.3; margin-bottom: 0.5rem; letter-spacing: -0.01em; }
        .job-company { font-size: 0.9rem; color: #6B7685; font-weight: 400; margin-bottom: 1.25rem; }
        .job-tags { display: flex; flex-wrap: wrap; gap: 0.4rem; }
        .tag { font-size: 0.68rem; font-weight: 500; padding: 0.25rem 0.7rem; border-radius: 3px; letter-spacing: 0.03em; }
        .t-cat { background: #E8FAF6; color: #0A8C74; }
        .t-loc { background: #F2F4F7; color: #6B7685; }
        .t-type { background: #F2F4F7; color: #6B7685; }
        .t-feat { background: #FEF6E4; color: #92660A; }

        .card-body { padding: 1.75rem 2rem; }
        .section-heading { font-family: 'Montserrat', sans-serif; font-size: 0.78rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #8B95A1; margin-bottom: 0.85rem; margin-top: 1.75rem; }
        .section-heading:first-child { margin-top: 0; }
        .job-description { font-size: 0.875rem; color: #3D4B5C; line-height: 1.8; white-space: pre-wrap; }

        .sidebar { display: flex; flex-direction: column; gap: 1rem; }
        .side-card { background: #fff; border: 1.5px solid #E8ECF0; border-radius: 8px; padding: 1.5rem; }
        .side-card-title { font-family: 'Montserrat', sans-serif; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #8B95A1; margin-bottom: 1.1rem; }

        .detail-row { display: flex; flex-direction: column; gap: 0.85rem; }
        .detail-item { display: flex; flex-direction: column; gap: 0.15rem; }
        .detail-label { font-size: 0.68rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #A0ACBB; }
        .detail-value { font-size: 0.82rem; color: #1B2A3F; font-weight: 500; }
        .detail-value.expired { color: #DC2626; }
        .detail-value.soon { color: #D97706; }
        .detail-value.ok { color: #0A8C74; }

        .apply-btn { display: block; width: 100%; padding: 0.9rem; background: #00C9A7; color: #1B2A3F; font-family: 'Poppins', sans-serif; font-size: 0.85rem; font-weight: 700; text-align: center; border-radius: 6px; text-decoration: none; letter-spacing: 0.04em; transition: opacity 0.2s; }
        .apply-btn:hover { opacity: 0.88; }
        .apply-btn-disabled { display: block; width: 100%; padding: 0.9rem; background: #E8ECF0; color: #A0ACBB; font-family: 'Poppins', sans-serif; font-size: 0.85rem; font-weight: 700; text-align: center; border-radius: 6px; letter-spacing: 0.04em; cursor: not-allowed; }
        .apply-note { font-size: 0.7rem; color: #A0ACBB; text-align: center; margin-top: 0.65rem; line-height: 1.5; }

        .back-link { display: inline-flex; align-items: center; gap: 0.4rem; font-size: 0.78rem; color: #6B7685; text-decoration: none; margin-bottom: 1.5rem; transition: color 0.15s; }
        .back-link:hover { color: #00C9A7; }

        .state { text-align: center; padding: 5rem 3rem; max-width: 860px; margin: 0 auto; }
        .state strong { font-family: 'Montserrat', sans-serif; font-size: 1.1rem; color: #1B2A3F; display: block; margin-bottom: 0.5rem; }
        .state p { font-size: 0.85rem; color: #8B95A1; }

        .footer { background: #1B2A3F; border-top: 1px solid rgba(255,255,255,0.06); padding: 2rem 3rem; }
        .footer-inner { max-width: 860px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; }
        .footer-logo { font-family: 'Montserrat', sans-serif; font-size: 1rem; font-weight: 700; color: #00C9A7; letter-spacing: 0.12em; }
        .footer-sub { font-size: 0.6rem; color: rgba(255,255,255,0.25); letter-spacing: 0.25em; text-transform: uppercase; margin-top: 0.2rem; }
        .footer-copy { font-size: 0.72rem; color: rgba(255,255,255,0.25); }

        @media (max-width: 720px) {
          .nav { padding: 0 1.25rem; }
          .breadcrumb { padding: 0 1.25rem 1rem; }
          .body { grid-template-columns: 1fr; padding: 1.5rem 1.25rem 4rem; }
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

        <div className="breadcrumb">
          <div className="breadcrumb-inner">
            <Link href="/">Home</Link>
            <span className="breadcrumb-sep">›</span>
            <Link href="/jobs">Jobs</Link>
            <span className="breadcrumb-sep">›</span>
            <span>{loading ? "Loading..." : job ? job.title : "Not Found"}</span>
          </div>
        </div>

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
          <div className="body">
            <div>
              <Link href="/jobs" className="back-link">← Back to Jobs</Link>
              <div className="main-card">
                <div className="card-header">
                  <div className="job-source">
                    {job.source === "ajira" ? "Ajira Portal" : "Daraja"}
                  </div>
                  <div className="job-title">{job.title}</div>
                  <div className="job-company">{job.company}</div>
                  <div className="job-tags">
                    <span className="tag t-cat">{job.category}</span>
                    <span className="tag t-loc">{job.location}</span>
                    <span className="tag t-type">{job.type.replace("_", " ")}</span>
                    {job.featured && <span className="tag t-feat">Featured</span>}
                  </div>
                </div>
                <div className="card-body">
                  <div className="section-heading">About this position</div>
                  <div className="job-description">{job.description}</div>
                  {job.salary && (
                    <>
                      <div className="section-heading">Salary</div>
                      <div className="job-description">{job.salary}</div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="sidebar">
              <div className="side-card">
                <div className="side-card-title">Apply for this role</div>
                {job.sourceUrl && !isExpired(job.deadline) ? (
                  <a href={job.sourceUrl} target="_blank" rel="noopener noreferrer" className="apply-btn">
                    Apply Now →
                  </a>
                ) : (
                  <div className="apply-btn-disabled">Applications Closed</div>
                )}
                {job.source === "ajira" && (
                  <p className="apply-note">
                    This position is on the Ajira Government Portal. You will be redirected to apply.
                  </p>
                )}
              </div>

              <div className="side-card">
                <div className="side-card-title">Job Details</div>
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
                    <div className="detail-label">Source</div>
                    <div className="detail-value">{job.source === "ajira" ? "Ajira Portal" : "Daraja"}</div>
                  </div>
                  <div className="detail-item">
                    <div className="detail-label">Posted</div>
                    <div className="detail-value">{formatDate(job.createdAt)}</div>
                  </div>
                </div>
              </div>

              <div className="side-card">
                <div className="side-card-title">Browse More</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <Link href={"/jobs?category=" + job.category} style={{ fontSize: "0.8rem", color: "#00C9A7", textDecoration: "none", fontWeight: 500 }}>
                    More {job.category} jobs →
                  </Link>
                  <Link href="/jobs" style={{ fontSize: "0.8rem", color: "#6B7685", textDecoration: "none" }}>
                    View all positions →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        <footer className="footer">
          <div className="footer-inner">
            <div>
              <div className="footer-logo">DARAJA</div>
              <div className="footer-sub">Kazi Na Fursa Tanzania</div>
            </div>
            <div className="footer-copy">2025 Daraja. All rights reserved.</div>
          </div>
        </footer>
      </div>
    </>
  );
}