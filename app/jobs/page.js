"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import AdSenseSlot from "@/components/AdSenseSlot";
import JobAlerts from "@/components/JobAlerts";
import { trackEvent } from "@/lib/analytics";

const CATEGORIES = [
  "Government", "NGO & Development", "Banking & Finance", "Technology",
  "Health", "Education", "Engineering", "Sales & Marketing",
  "Accounting & Audit", "HR & Administration", "Legal",
  "Logistics & Transport", "Hospitality & Tourism", "Agriculture",
  "Mining, Energy, Oil & Gas", "Manufacturing",
  "Internships & Graduate Programs", "General",
];

export default function JobsPage() {
  const [jobs, setJobs] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("active");
  const [page, setPage] = useState(1);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      const params = new URLSearchParams(window.location.search);
      const initialSearch = params.get("search") || "";
      const initialCategory = params.get("category") || "";
      const initialStatus = params.get("status") || "active";
      const initialPage = Number.parseInt(params.get("page") || "1", 10);

      setSearch(initialSearch);
      setSubmittedSearch(initialSearch);
      setCategory(CATEGORIES.includes(initialCategory) ? initialCategory : "");
      setStatus(["active", "expired", "all"].includes(initialStatus) ? initialStatus : "active");
      setPage(Number.isFinite(initialPage) && initialPage > 0 ? initialPage : 1);
      setInitialized(true);
    });
  }, []);

  const fetchJobs = useCallback(async function fetchJobs() {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      params.set("page", page);
      params.set("limit", "20");
      if (category && category !== "All") params.set("category", category);
      if (submittedSearch) params.set("search", submittedSearch);
      params.set("status", status);
      const res = await fetch(`/api/jobs?${params.toString()}`);
      if (!res.ok) throw new Error("Unable to load jobs");
      const data = await res.json();
      setJobs(data.jobs || []);
      setPagination(data.pagination || {});
    } catch (error) {
      console.error(error);
      setJobs([]);
      setPagination({});
      setError("We could not load the jobs. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [page, category, submittedSearch, status]);

  useEffect(() => {
    if (!initialized) return;

    queueMicrotask(fetchJobs);

    const params = new URLSearchParams();
    if (submittedSearch) params.set("search", submittedSearch);
    if (category) params.set("category", category);
    if (status !== "active") params.set("status", status);
    if (page > 1) params.set("page", String(page));
    const query = params.toString();
    window.history.replaceState(null, "", query ? `/jobs?${query}` : "/jobs");
  }, [initialized, page, category, status, submittedSearch, fetchJobs]);

  function handleSearch(e) {
    e.preventDefault();
    const query = search.trim();
    setPage(1);
    setSubmittedSearch(query);
    trackEvent("search", {
      search_term: query || "(all jobs)",
      job_category: category || "All categories",
      job_status: status,
    });
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
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .dr { font-family: inherit; background: #F7F8FA; min-height: 100vh; color: #1B2A3F; }

        /* NAV */
        .nav { background: #1B2A3F; height: 64px; padding: 0 3rem; display: flex; align-items: center; justify-content: space-between; }
        .nav-logo { font-family: inherit; font-size: 1.4rem; font-weight: 700; color: #00C9A7; letter-spacing: 0.1em; text-decoration: none; }
        .nav-logo span { display: block; font-size: 0.55rem; font-weight: 400; color: rgba(255,255,255,0.35); letter-spacing: 0.3em; text-transform: uppercase; margin-top: 1px; }
        .nav-cta { font-family: inherit; font-size: 0.78rem; font-weight: 600; background: #00C9A7; color: #1B2A3F; padding: 0.55rem 1.4rem; border-radius: 4px; text-decoration: none; letter-spacing: 0.03em; transition: opacity 0.2s; }
        .nav-cta:hover { opacity: 0.88; }

        /* SEARCH HEADER */
        .header { background: #1B2A3F; padding: 3rem 3rem 2.5rem; }
        .header-inner { max-width: 860px; margin: 0 auto; }
        .header h1 { font-family: inherit; font-size: 1.9rem; font-weight: 700; color: #fff; margin-bottom: 1.5rem; letter-spacing: -0.02em; }
        .header h1 span { color: #00C9A7; }

        .search-row { display: flex; }
        .search-input { flex: 1; padding: 0.85rem 1.2rem; background: #fff; border: none; font-family: inherit; font-size: 0.88rem; color: #1B2A3F; outline: none; border-radius: 4px 0 0 4px; }
        .search-input::placeholder { color: #A0ACBB; }
        .search-input:focus-visible, .search-btn:focus-visible, .f-btn:focus-visible, .pg-btn:focus-visible, .job-card:focus-visible, .nav-cta:focus-visible, .nav-logo:focus-visible { outline: 3px solid #F59E0B; outline-offset: 3px; }
        .search-btn { padding: 0.85rem 1.75rem; background: #00C9A7; color: #1B2A3F; font-family: inherit; font-size: 0.82rem; font-weight: 600; border: none; cursor: pointer; border-radius: 0 4px 4px 0; letter-spacing: 0.04em; transition: opacity 0.2s; }
        .search-btn:hover { opacity: 0.88; }

        /* BODY */
        .body { max-width: 860px; margin: 0 auto; padding: 2rem 3rem 4rem; }

        /* FILTERS */
        .filters { display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); gap: 0.75rem; margin-bottom: 1.5rem; }
        .filter-group { margin: 0; }
        .filter-label { display: block; font-size: 0.72rem; font-weight: 600; color: #5F6B7A; margin-bottom: 0.55rem; }
        .filter-select { width: 100%; min-height: 46px; padding: 0.65rem 0.8rem; border: 1.5px solid #DDE1E8; border-radius: 6px; background: #fff; color: #1B2A3F; font: 500 0.82rem 'Poppins', sans-serif; }
        .filter-select:focus-visible { outline: 3px solid #F59E0B; outline-offset: 2px; border-color: #1B2A3F; }

        /* META */
        .meta { font-size: 0.78rem; color: #8B95A1; margin-bottom: 1.25rem; letter-spacing: 0.02em; }

        /* JOB LIST */
        .job-list { display: flex; flex-direction: column; gap: 1px; }

        .job-card { display: block; text-decoration: none; background: #fff; border: 1px solid #E8ECF0; border-radius: 8px; padding: 1.4rem 1.6rem; margin-bottom: 0.5rem; transition: border-color 0.15s, box-shadow 0.15s; }
        .job-card:hover { border-color: #00C9A7; box-shadow: 0 2px 12px rgba(0,201,167,0.08); }

        .jc-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 1.5rem; }
        .jc-left { flex: 1; min-width: 0; }
        .jc-right { text-align: right; flex-shrink: 0; }

        .jc-title { font-family: inherit; font-size: 0.95rem; font-weight: 600; color: #1B2A3F; line-height: 1.4; margin-bottom: 0.25rem; }
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

        /* STATES */
        .state-loading { text-align: center; padding: 5rem 0; font-size: 0.85rem; color: #8B95A1; }
        .state-empty, .state-error { text-align: center; padding: 5rem 0; }
        .state-empty p { font-size: 0.85rem; color: #8B95A1; margin-top: 0.5rem; }
        .state-empty strong { font-family: inherit; font-size: 1.1rem; color: #1B2A3F; }
        .state-error { color: #B42318; font-size: 0.85rem; }
        .retry-btn { margin-top: 1rem; border: 0; border-radius: 4px; background: #1B2A3F; color: #fff; padding: 0.65rem 1rem; cursor: pointer; font: inherit; }

        /* PAGINATION */
        .pager { display: flex; justify-content: center; gap: 0.3rem; margin-top: 2.5rem; }
        .pg-btn { min-width: 44px; min-height: 44px; display: flex; align-items: center; justify-content: center; font-size: 0.78rem; font-family: inherit; border: 1.5px solid #DDE1E8; border-radius: 4px; background: #fff; cursor: pointer; color: #6B7685; transition: all 0.15s; }
        .pg-btn:hover:not(:disabled) { border-color: #1B2A3F; color: #1B2A3F; }
        .pg-btn.active { background: #1B2A3F; color: #00C9A7; border-color: #1B2A3F; }
        .pg-btn:disabled { opacity: 0.3; cursor: not-allowed; }
        .pg-nav { width: auto; padding: 0 0.9rem; font-size: 0.75rem; font-weight: 500; }

        /* FOOTER */
        .footer { background: #1B2A3F; padding: 2rem 3rem; text-align: center; }
        .footer-logo { font-family: inherit; font-size: 1rem; font-weight: 700; color: #00C9A7; letter-spacing: 0.12em; }
        .footer-sub { font-size: 0.6rem; color: rgba(255,255,255,0.25); letter-spacing: 0.25em; text-transform: uppercase; margin-top: 0.25rem; }

        @media (max-width: 640px) {
          .nav { padding: 0 1.25rem; }
          .header { padding: 2rem 1.25rem; }
          .body { padding: 1.5rem 1.25rem 3rem; }
          .footer { padding: 1.5rem 1.25rem; }
          .header h1 { font-size: 1.4rem; }
          .jc-top { flex-direction: column; gap: 0.75rem; }
          .jc-right { text-align: left; }
          .filters { grid-template-columns: 1fr; }
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
        <header className="header">
          <div className="header-inner">
            <h1>Browse <span>Jobs</span> in Tanzania</h1>
            <form className="search-row" onSubmit={handleSearch}>
              <label htmlFor="job-search" className="sr-only">Search by job title, company, or keyword</label>
              <input
                id="job-search"
                className="search-input"
                type="text"
                placeholder="Job title, company, or keyword..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button className="search-btn" type="submit">Search</button>
            </form>
          </div>
        </header>

        {/* Content */}
        <main className="body" id="main-content">
          {/* Filters */}
          <div className="filters" aria-label="Job filters">
            <div className="filter-group">
              <label className="filter-label" htmlFor="category-filter">Category</label>
              <select
                id="category-filter"
                className="filter-select"
                value={category}
                onChange={(event) => {
                  const value = event.target.value;
                  setCategory(value);
                  setPage(1);
                  trackEvent("job_filter", {
                    filter_name: "category",
                    filter_value: value || "All categories",
                  });
                }}
              >
                <option value="">All categories</option>
                {CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <div className="filter-group">
              <label className="filter-label" htmlFor="status-filter">Status</label>
              <select
                id="status-filter"
                className="filter-select"
                value={status}
                onChange={(event) => {
                  const value = event.target.value;
                  setStatus(value);
                  setPage(1);
                  trackEvent("job_filter", {
                    filter_name: "status",
                    filter_value: value,
                  });
                }}
              >
                <option value="active">Open jobs</option>
                <option value="expired">Expired jobs</option>
                <option value="all">All jobs</option>
              </select>
            </div>
          </div>

          {/* Meta */}
          <div className="meta" aria-live="polite">
            {loading
              ? "Loading jobs..."
              : `${pagination.total || 0} ${status === "active" ? "open" : status} job${pagination.total === 1 ? "" : "s"}`}
          </div>

          {/* Jobs */}
          {loading ? (
            <div className="state-loading" role="status">Loading jobs...</div>
          ) : error ? (
            <div className="state-error" role="alert">
              <p>{error}</p>
              <button className="retry-btn" type="button" onClick={fetchJobs}>Try again</button>
            </div>
          ) : jobs.length === 0 ? (
            <div className="state-empty">
              <strong>No positions found</strong>
              <p>Try a different search term or category</p>
            </div>
          ) : (
            <section className="job-list" aria-label="Job search results">
              {jobs.map((job) => (
                <Link
                  key={job.id}
                  href={`/jobs/${job.slug || job.id}`}
                  className="job-card"
                  onClick={() => trackEvent("select_item", {
                    item_list_name: "Job search results",
                    items: [{
                      item_id: job.id,
                      item_name: job.title,
                      item_brand: job.company,
                      item_category: job.category,
                    }],
                  })}
                >
                  <div className="jc-top">
                    <div className="jc-left">
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
            </section>
          )}

          <JobAlerts />

          {/* Pagination */}
          <AdSenseSlot
            slot={process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_JOB_LIST_SLOT}
            label="Sponsored job-listing advertisement"
          />

          {pagination.pages > 1 && (
            <nav className="pager" aria-label="Job results pagination">
              <button className="pg-btn pg-nav" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>← Prev</button>
              <span className="pg-btn active" aria-current="page">{page} / {pagination.pages}</span>
              <button className="pg-btn pg-nav" onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))} disabled={page === pagination.pages}>Next →</button>
            </nav>
          )}
        </main>

        {/* Footer */}
        <footer className="footer">
          <div className="footer-logo">DARAJA</div>
          <div className="footer-sub">Kazi Na Fursa Tanzania</div>
        </footer>
      </div>
    </>
  );
}
