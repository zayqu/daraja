"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function JobsPage() {
  const [jobs, setJobs] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);

  const categories = [
    "All", "Government", "Education", "Health",
    "Finance", "IT", "Engineering", "NGO",
  ];

  useEffect(() => { fetchJobs(); }, [page, category]);

  async function fetchJobs() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", page);
      params.set("limit", "20");
      if (category && category !== "All") params.set("category", category);
      if (search) params.set("search", search);
      const res = await fetch(`/api/jobs?${params.toString()}`);
      const data = await res.json();
      setJobs(data.jobs || []);
      setPagination(data.pagination || {});
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e) {
    e.preventDefault();
    setPage(1);
    fetchJobs();
  }

  function formatDate(d) {
    if (!d) return null;
    return new Date(d).toLocaleDateString("en-GB", {
      day: "numeric", month: "short", year: "numeric",
    });
  }

  function isExpired(d) { return d && new Date(d) < new Date(); }

  function isExpiringSoon(d) {
    if (!d) return false;
    const days = (new Date(d) - new Date()) / 86400000;
    return days <= 7 && days > 0;
  }

  function timeAgo(d) {
    const days = Math.floor((new Date() - new Date(d)) / 86400000);
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    return formatDate(d);
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&family=Poppins:wght@300;400;500;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .dr { font-family: 'Poppins', sans-serif; background: #F7F8FA; min-height: 100vh; color: #1B2A3F; }

        /* NAV */
        .nav { background: #1B2A3F; height: 64px; padding: 0 3rem; display: flex; align-items: center; justify-content: space-between; }
        .nav-logo { font-family: 'Montserrat', sans-serif; font-size: 1.4rem; font-weight: 700; color: #00C9A7; letter-spacing: 0.1em; text-decoration: none; }
        .nav-logo span { display: block; font-size: 0.55rem; font-weight: 400; color: rgba(255,255,255,0.35); letter-spacing: 0.3em; text-transform: uppercase; margin-top: 1px; }
        .nav-cta { font-family: 'Poppins', sans-serif; font-size: 0.78rem; font-weight: 600; background: #00C9A7; color: #1B2A3F; padding: 0.55rem 1.4rem; border-radius: 4px; text-decoration: none; letter-spacing: 0.03em; transition: opacity 0.2s; }
        .nav-cta:hover { opacity: 0.88; }

        /* SEARCH HEADER */
        .header { background: #1B2A3F; padding: 3rem 3rem 2.5rem; }
        .header-inner { max-width: 860px; margin: 0 auto; }
        .header h1 { font-family: 'Montserrat', sans-serif; font-size: 1.9rem; font-weight: 700; color: #fff; margin-bottom: 1.5rem; letter-spacing: -0.02em; }
        .header h1 span { color: #00C9A7; }

        .search-row { display: flex; }
        .search-input { flex: 1; padding: 0.85rem 1.2rem; background: #fff; border: none; font-family: 'Poppins', sans-serif; font-size: 0.88rem; color: #1B2A3F; outline: none; border-radius: 4px 0 0 4px; }
        .search-input::placeholder { color: #A0ACBB; }
        .search-btn { padding: 0.85rem 1.75rem; background: #00C9A7; color: #1B2A3F; font-family: 'Poppins', sans-serif; font-size: 0.82rem; font-weight: 600; border: none; cursor: pointer; border-radius: 0 4px 4px 0; letter-spacing: 0.04em; transition: opacity 0.2s; }
        .search-btn:hover { opacity: 0.88; }

        /* BODY */
        .body { max-width: 860px; margin: 0 auto; padding: 2rem 3rem 4rem; }

        /* FILTERS */
        .filters { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1.75rem; }
        .f-btn { font-family: 'Poppins', sans-serif; font-size: 0.75rem; font-weight: 500; padding: 0.38rem 1rem; border-radius: 100px; border: 1.5px solid #DDE1E8; background: #fff; color: #6B7685; cursor: pointer; transition: all 0.15s; letter-spacing: 0.02em; }
        .f-btn:hover { border-color: #00C9A7; color: #1B2A3F; }
        .f-btn.active { background: #1B2A3F; color: #00C9A7; border-color: #1B2A3F; }

        /* META */
        .meta { font-size: 0.78rem; color: #8B95A1; margin-bottom: 1.25rem; letter-spacing: 0.02em; }

        /* JOB LIST */
        .job-list { display: flex; flex-direction: column; gap: 1px; }

        .job-card { display: block; text-decoration: none; background: #fff; border: 1px solid #E8ECF0; border-radius: 8px; padding: 1.4rem 1.6rem; margin-bottom: 0.5rem; transition: border-color 0.15s, box-shadow 0.15s; }
        .job-card:hover { border-color: #00C9A7; box-shadow: 0 2px 12px rgba(0,201,167,0.08); }

        .jc-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 1.5rem; }
        .jc-left { flex: 1; min-width: 0; }
        .jc-right { text-align: right; flex-shrink: 0; }

        .jc-title { font-family: 'Montserrat', sans-serif; font-size: 0.95rem; font-weight: 600; color: #1B2A3F; line-height: 1.4; margin-bottom: 0.25rem; }
        .job-card:hover .jc-title { color: #00C9A7; }
        .jc-company { font-size: 0.8rem; color: #6B7685; font-weight: 400; margin-bottom: 0.9rem; }

        .jc-tags { display: flex; flex-wrap: wrap; gap: 0.35rem; }
        .tag { font-size: 0.68rem; font-weight: 500; padding: 0.2rem 0.6rem; border-radius: 3px; letter-spacing: 0.03em; }
        .t-cat { background: #E8FAF6; color: #0A8C74; }
        .t-loc { background: #F2F4F7; color: #6B7685; }
        .t-type { background: #F2F4F7; color: #6B7685; }
        .t-feat { background: #FEF6E4; color: #92660A; }

        .jc-time { font-size: 0.72rem; color: #A0ACBB; margin-bottom: 0.3rem; }
        .jc-deadline { font-size: 0.72rem; font-weight: 500; }
        .dl-ok { color: #A0ACBB; }
        .dl-soon { color: #D97706; }
        .dl-exp { color: #DC2626; }

        .jc-source { font-size: 0.65rem; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: #00C9A7; margin-bottom: 0.5rem; }

        /* STATES */
        .state-loading { text-align: center; padding: 5rem 0; font-size: 0.85rem; color: #8B95A1; }
        .state-empty { text-align: center; padding: 5rem 0; }
        .state-empty p { font-size: 0.85rem; color: #8B95A1; margin-top: 0.5rem; }
        .state-empty strong { font-family: 'Montserrat', sans-serif; font-size: 1.1rem; color: #1B2A3F; }

        /* PAGINATION */
        .pager { display: flex; justify-content: center; gap: 0.3rem; margin-top: 2.5rem; }
        .pg-btn { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; font-size: 0.78rem; font-family: 'Poppins', sans-serif; border: 1.5px solid #DDE1E8; border-radius: 4px; background: #fff; cursor: pointer; color: #6B7685; transition: all 0.15s; }
        .pg-btn:hover:not(:disabled) { border-color: #1B2A3F; color: #1B2A3F; }
        .pg-btn.active { background: #1B2A3F; color: #00C9A7; border-color: #1B2A3F; }
        .pg-btn:disabled { opacity: 0.3; cursor: not-allowed; }
        .pg-nav { width: auto; padding: 0 0.9rem; font-size: 0.75rem; font-weight: 500; }

        /* FOOTER */
        .footer { background: #1B2A3F; padding: 2rem 3rem; text-align: center; }
        .footer-logo { font-family: 'Montserrat', sans-serif; font-size: 1rem; font-weight: 700; color: #00C9A7; letter-spacing: 0.12em; }
        .footer-sub { font-size: 0.6rem; color: rgba(255,255,255,0.25); letter-spacing: 0.25em; text-transform: uppercase; margin-top: 0.25rem; }

        @media (max-width: 640px) {
          .nav { padding: 0 1.25rem; }
          .header { padding: 2rem 1.25rem; }
          .body { padding: 1.5rem 1.25rem 3rem; }
          .footer { padding: 1.5rem 1.25rem; }
          .header h1 { font-size: 1.4rem; }
          .jc-top { flex-direction: column; gap: 0.75rem; }
          .jc-right { text-align: left; }
        }
      `}</style>

      <div className="dr">
        {/* Navbar */}
        <nav className="nav">
          <Link href="/" className="nav-logo">
            DARAJA
            <span>Kazi Na Fursa Tanzania</span>
          </Link>
          <Link href="/post-job" className="nav-cta">Post a Job</Link>
        </nav>

        {/* Search header */}
        <div className="header">
          <div className="header-inner">
            <h1>Browse <span>Jobs</span> in Tanzania</h1>
            <form className="search-row" onSubmit={handleSearch}>
              <input
                className="search-input"
                type="text"
                placeholder="Job title, company, or keyword..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button className="search-btn" type="submit">Search</button>
            </form>
          </div>
        </div>

        {/* Content */}
        <div className="body">
          {/* Filters */}
          <div className="filters">
            {categories.map((cat) => (
              <button
                key={cat}
                className={`f-btn ${(cat === "All" && !category) || category === cat ? "active" : ""}`}
                onClick={() => { setCategory(cat === "All" ? "" : cat); setPage(1); }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Meta */}
          <div className="meta">
            {loading ? "Loading..." : `${pagination.total || 0} positions available`}
          </div>

          {/* Jobs */}
          {loading ? (
            <div className="state-loading">Loading positions...</div>
          ) : jobs.length === 0 ? (
            <div className="state-empty">
              <strong>No positions found</strong>
              <p>Try a different search term or category</p>
            </div>
          ) : (
            <div className="job-list">
              {jobs.map((job) => (
                <Link key={job.id} href={`/jobs/${job.id}`} className="job-card">
                  <div className="jc-top">
                    <div className="jc-left">
                      <div className="jc-source">
                        {job.source === "ajira" ? "Ajira Portal" : "Daraja"}
                      </div>
                      <div className="jc-title">{job.title}</div>
                      <div className="jc-company">{job.company}</div>
                      <div className="jc-tags">
                        <span className="tag t-cat">{job.category}</span>
                        <span className="tag t-loc">{job.location}</span>
                        <span className="tag t-type">{job.type.replace("_", " ")}</span>
                        {job.featured && <span className="tag t-feat">Featured</span>}
                      </div>
                    </div>
                    <div className="jc-right">
                      <div className="jc-time">{timeAgo(job.createdAt)}</div>
                      {job.deadline && (
                        <div className={`jc-deadline ${isExpired(job.deadline) ? "dl-exp" : isExpiringSoon(job.deadline) ? "dl-soon" : "dl-ok"}`}>
                          {isExpired(job.deadline) ? "Expired" : `Closes ${formatDate(job.deadline)}`}
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="pager">
              <button className="pg-btn pg-nav" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>← Prev</button>
              {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((p) => (
                <button key={p} className={`pg-btn ${page === p ? "active" : ""}`} onClick={() => setPage(p)}>{p}</button>
              ))}
              <button className="pg-btn pg-nav" onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))} disabled={page === pagination.pages}>Next →</button>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="footer">
          <div className="footer-logo">DARAJA</div>
          <div className="footer-sub">Kazi Na Fursa Tanzania</div>
        </footer>
      </div>
    </>
  );
}