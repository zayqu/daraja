"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import AdSenseSlot from "@/components/AdSenseSlot";
import JobAlerts from "@/components/JobAlerts";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import { trackEvent } from "@/lib/analytics";
import { JOB_CATEGORIES } from "@/lib/job-categories";
import {
  JOB_TYPES,
  buildJobsUrl,
} from "@/lib/job-search";

const JOB_TYPE_LABELS = {
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  CONTRACT: "Contract",
  INTERNSHIP: "Internship",
  FREELANCE: "Freelance",
};

export default function JobsPageClient({
  showEmployerCta,
  initialJobs,
  initialPagination,
  initialFilters,
  initialError = "",
}) {
  const [jobs, setJobs] = useState(initialJobs);
  const [pagination, setPagination] = useState(initialPagination);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initialError);

  const [search, setSearch] = useState(initialFilters.search);
  const [submittedSearch, setSubmittedSearch] = useState(initialFilters.search);
  const [category, setCategory] = useState(initialFilters.category);
  const [location, setLocation] = useState(initialFilters.location);
  const [type, setType] = useState(initialFilters.type);
  const [status, setStatus] = useState(initialFilters.status);
  const [page, setPage] = useState(initialFilters.page);
  const skipInitialFetch = useRef(true);

  const fetchJobs = useCallback(async function fetchJobs() {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      params.set("page", page);
      params.set("limit", "20");
      if (category) params.set("category", category);
      if (location) params.set("location", location);
      if (type) params.set("type", type);
      if (submittedSearch) params.set("search", submittedSearch);
      params.set("status", status);

      const response = await fetch(`/api/jobs?${params.toString()}`);
      if (!response.ok) throw new Error("Unable to load jobs");

      const data = await response.json();
      setJobs(data.jobs || []);
      setPagination(data.pagination || {});
    } catch (fetchError) {
      console.error(fetchError);
      setJobs([]);
      setPagination({});
      setError("We could not load the jobs. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [page, category, location, type, submittedSearch, status]);

  useEffect(() => {
    if (skipInitialFetch.current) {
      skipInitialFetch.current = false;
      return;
    }

    queueMicrotask(fetchJobs);

    window.history.replaceState(
      null,
      "",
      buildJobsUrl({
        search: submittedSearch,
        category,
        location,
        type,
        status,
        page,
      })
    );
  }, [
    page,
    category,
    location,
    type,
    status,
    submittedSearch,
    fetchJobs,
  ]);

  function handleSearch(event) {
    event.preventDefault();
    const query = search.trim();
    setPage(1);
    setSubmittedSearch(query);
    trackEvent("search", {
      search_term: query || "(all jobs)",
      job_category: category || "All categories",
      job_status: status,
    });
  }

  function clearFilters() {
    setSearch("");
    setSubmittedSearch("");
    setCategory("");
    setLocation("");
    setType("");
    setStatus("active");
    setPage(1);
  }

  function formatDate(value) {
    if (!value) return null;
    return new Date(value).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function isExpired(value) {
    return value && new Date(value) < new Date();
  }

  function daysUntil(value) {
    if (!value) return null;
    return Math.ceil((new Date(value) - new Date()) / 86400000);
  }

  function deadlineLabel(value) {
    if (!value) return null;
    const days = daysUntil(value);

    if (days < 0) return "Expired";
    if (days === 0) return "Closes today";
    if (days === 1) return "Closes tomorrow";
    if (days <= 7) return `Closes in ${days} days`;
    return `Closes ${formatDate(value)}`;
  }

  function timeAgo(value) {
    const days = Math.floor((new Date() - new Date(value)) / 86400000);
    if (days === 0) return "Posted today";
    if (days === 1) return "Posted yesterday";
    if (days < 7) return `Posted ${days} days ago`;
    return `Posted ${formatDate(value)}`;
  }

  return (
    <>
      <style>{`
        .jobs-page {
          min-height: 100vh;
          background: #f7f8fa;
          color: #1b2a3f;
        }

        .jobs-hero {
          padding: 3rem var(--gutter) 3.25rem;
          background: #1b2a3f;
        }

        .jobs-hero-inner {
          max-width: 1080px;
          margin: 0 auto;
        }

        .jobs-eyebrow {
          color: #00c9a7;
          font-size: .7rem;
          font-weight: 700;
          letter-spacing: .16em;
          text-transform: uppercase;
        }

        .jobs-hero h1 {
          margin: .55rem 0 1.45rem;
          color: #fff;
          font-size: clamp(2rem, 5vw, 3.25rem);
          line-height: 1.05;
          letter-spacing: -.04em;
        }

        .search-shell {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: .65rem;
          max-width: 760px;
          padding: .65rem;
          border-radius: 16px;
          background: #fff;
        }

        .search-input {
          min-width: 0;
          min-height: 50px;
          padding: 0 .95rem;
          border: 1px solid #e4e8ed;
          border-radius: 11px;
          color: #1b2a3f;
          outline: 0;
        }

        .search-input:focus {
          border-color: #00c9a7;
          box-shadow: 0 0 0 3px rgba(0,201,167,.08);
        }

        .search-btn {
          min-height: 50px;
          padding: 0 1.35rem;
          border: 0;
          border-radius: 11px;
          background: #00c9a7;
          color: #1b2a3f;
          font-weight: 800;
          cursor: pointer;
        }

        .jobs-main {
          max-width: 1080px;
          margin: 0 auto;
          padding: 2rem var(--gutter) 4rem;
        }

        .jobs-layout {
          display: grid;
          grid-template-columns: 270px minmax(0, 1fr);
          gap: 1.5rem;
          align-items: start;
        }

        .filters {
          position: sticky;
          top: 1rem;
          padding: 1.25rem;
          border: 1px solid #e3e8ee;
          border-radius: 16px;
          background: #fff;
        }

        .filters-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: .75rem;
          margin-bottom: 1.1rem;
        }

        .filters-head h2 {
          font-size: 1rem;
        }

        .clear-btn {
          border: 0;
          background: transparent;
          color: #087f6c;
          font-size: .72rem;
          font-weight: 700;
          cursor: pointer;
        }

        .filter-group + .filter-group {
          margin-top: 1rem;
        }

        .filter-label {
          display: block;
          margin-bottom: .45rem;
          color: #5f6b7a;
          font-size: .7rem;
          font-weight: 700;
        }

        .filter-control {
          width: 100%;
          min-height: 44px;
          padding: 0 .75rem;
          border: 1px solid #dfe4e9;
          border-radius: 10px;
          background: #fff;
          color: #1b2a3f;
          outline: 0;
        }

        .filter-control:focus {
          border-color: #00c9a7;
        }

        .results {
          min-width: 0;
        }

        .results-head {
          min-height: 48px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .results-count {
          color: #667085;
          font-size: .8rem;
        }

        .results-count strong {
          color: #1b2a3f;
        }

        .result-context {
          color: #8b95a1;
          font-size: .72rem;
          text-align: right;
        }

        .job-list {
          display: flex;
          flex-direction: column;
          gap: .8rem;
        }

        .job-card {
          display: block;
          padding: 1.25rem;
          border: 1px solid #e3e8ee;
          border-radius: 16px;
          background: #fff;
          color: inherit;
          text-decoration: none;
          transition: border-color .15s ease, transform .15s ease, box-shadow .15s ease;
        }

        .job-card:hover {
          transform: translateY(-1px);
          border-color: #00c9a7;
          box-shadow: var(--shadow-card);
        }

        .job-card-top {
          display: flex;
          gap: 1rem;
          align-items: flex-start;
        }

        .company-mark {
          width: 48px;
          height: 48px;
          flex: 0 0 48px;
          display: grid;
          place-items: center;
          border-radius: 12px;
          background: #e8faf6;
          color: #087f6c;
          font-weight: 800;
          font-size: .85rem;
        }

        .job-card-main {
          flex: 1;
          min-width: 0;
        }

        .job-company {
          margin-bottom: .28rem;
          color: #7b8592;
          font-size: .76rem;
        }

        .job-title {
          color: #1b2a3f;
          font-size: 1rem;
          font-weight: 750;
          line-height: 1.4;
        }

        .job-card:hover .job-title {
          color: #087f6c;
        }

        .job-meta {
          display: flex;
          flex-wrap: wrap;
          gap: .4rem .85rem;
          margin-top: .7rem;
          color: #75808d;
          font-size: .72rem;
        }

        .job-card-side {
          flex: 0 0 auto;
          text-align: right;
        }

        .posted {
          color: #98a1ad;
          font-size: .68rem;
        }

        .deadline {
          margin-top: .45rem;
          color: #7a8492;
          font-size: .7rem;
          font-weight: 700;
        }

        .deadline.soon {
          color: #c76a00;
        }

        .deadline.expired {
          color: #b42318;
        }

        .job-card-bottom {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid #eef1f4;
        }

        .tags {
          display: flex;
          flex-wrap: wrap;
          gap: .4rem;
        }

        .tag {
          padding: .28rem .65rem;
          border-radius: 999px;
          background: #f1f4f6;
          color: #5f6b7a;
          font-size: .66rem;
          font-weight: 650;
        }

        .tag.category {
          background: #e8faf6;
          color: #087f6c;
        }

        .tag.featured {
          background: #fff5dc;
          color: #8b6200;
        }

        .view-link {
          flex-shrink: 0;
          color: #087f6c;
          font-size: .72rem;
          font-weight: 800;
        }

        .state {
          padding: 4.5rem 1rem;
          border: 1px solid #e3e8ee;
          border-radius: 16px;
          background: #fff;
          color: #7a8492;
          text-align: center;
        }

        .state strong {
          display: block;
          margin-bottom: .35rem;
          color: #1b2a3f;
          font-size: 1rem;
        }

        .state.error {
          color: #b42318;
        }

        .retry-btn {
          margin-top: 1rem;
          padding: .65rem 1rem;
          border: 0;
          border-radius: 10px;
          background: #1b2a3f;
          color: #fff;
          cursor: pointer;
        }

        .pager {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: .4rem;
          margin-top: 1.5rem;
        }

        .page-btn {
          min-height: 42px;
          padding: 0 .85rem;
          border: 1px solid #dfe4e9;
          border-radius: 10px;
          background: #fff;
          color: #5f6b7a;
          cursor: pointer;
        }

        .page-btn:disabled {
          opacity: .35;
          cursor: not-allowed;
        }

        .page-status {
          min-height: 42px;
          display: inline-flex;
          align-items: center;
          padding: 0 .9rem;
          border-radius: 10px;
          background: #1b2a3f;
          color: #fff;
          font-size: .74rem;
          font-weight: 700;
        }

        @media (max-width: 820px) {
          .jobs-layout {
            grid-template-columns: 1fr;
          }

          .filters {
            position: static;
            display: grid;
            grid-template-columns: repeat(2, minmax(0,1fr));
            gap: .9rem;
          }

          .filters-head {
            grid-column: 1 / -1;
            margin-bottom: 0;
          }

          .filter-group + .filter-group {
            margin-top: 0;
          }
        }

        @media (max-width: 640px) {
          .jobs-hero {
            padding-top: 2.4rem;
            padding-bottom: 2.6rem;
          }

          .search-shell {
            grid-template-columns: 1fr;
          }

          .filters {
            grid-template-columns: 1fr;
          }

          .job-card-top {
            align-items: flex-start;
          }

          .job-card-side {
            display: none;
          }

          .job-card-bottom {
            align-items: flex-start;
            flex-direction: column;
          }

          .results-head {
            align-items: flex-start;
            flex-direction: column;
          }

          .result-context {
            text-align: left;
          }
        }
      `}</style>

      <div className="jobs-page">
        <SiteNav showEmployerCta={showEmployerCta} />

        <header className="jobs-hero">
          <div className="jobs-hero-inner">
            <div className="jobs-eyebrow">Find your next opportunity</div>
            <h1>Jobs across Tanzania</h1>

            <form className="search-shell" onSubmit={handleSearch} role="search">
              <label htmlFor="job-search" className="sr-only">
                Search by job title, company, or keyword
              </label>
              <input
                id="job-search"
                className="search-input"
                type="search"
                placeholder="Job title, company or keyword"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <button className="search-btn" type="submit">Search jobs</button>
            </form>
          </div>
        </header>

        <main className="jobs-main" id="main-content">
          <div className="jobs-layout">
            <aside className="filters" aria-label="Job filters">
              <div className="filters-head">
                <h2>Filter jobs</h2>
                <button type="button" className="clear-btn" onClick={clearFilters}>
                  Clear all
                </button>
              </div>

              <div className="filter-group">
                <label className="filter-label" htmlFor="category-filter">Category</label>
                <select
                  id="category-filter"
                  className="filter-control"
                  value={category}
                  onChange={(event) => {
                    setCategory(event.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">All categories</option>
                  {JOB_CATEGORIES.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label className="filter-label" htmlFor="location-filter">Location</label>
                <input
                  id="location-filter"
                  className="filter-control"
                  type="search"
                  placeholder="e.g. Dar es Salaam"
                  value={location}
                  onChange={(event) => {
                    setLocation(event.target.value);
                    setPage(1);
                  }}
                />
              </div>

              <div className="filter-group">
                <label className="filter-label" htmlFor="type-filter">Job type</label>
                <select
                  id="type-filter"
                  className="filter-control"
                  value={type}
                  onChange={(event) => {
                    setType(event.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">All job types</option>
                  {JOB_TYPES.map((item) => (
                    <option key={item} value={item}>{JOB_TYPE_LABELS[item]}</option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label className="filter-label" htmlFor="status-filter">Status</label>
                <select
                  id="status-filter"
                  className="filter-control"
                  value={status}
                  onChange={(event) => {
                    setStatus(event.target.value);
                    setPage(1);
                  }}
                >
                  <option value="active">Open jobs</option>
                  <option value="expired">Expired jobs</option>
                  <option value="all">All jobs</option>
                </select>
              </div>
            </aside>

            <section className="results" aria-label="Job search results">
              <div className="results-head">
                <div className="results-count" aria-live="polite">
                  {loading ? (
                    "Loading opportunities..."
                  ) : (
                    <><strong>{pagination.total || 0}</strong> {status === "active" ? "open" : status} job{pagination.total === 1 ? "" : "s"}</>
                  )}
                </div>
                <div className="result-context">
                  Page {pagination.page || page}{pagination.pages ? ` of ${pagination.pages}` : ""}
                </div>
              </div>

              {loading ? (
                <div className="state" role="status">Loading jobs...</div>
              ) : error ? (
                <div className="state error" role="alert">
                  <strong>Jobs did not load</strong>
                  <p>{error}</p>
                  <button className="retry-btn" type="button" onClick={fetchJobs}>Try again</button>
                </div>
              ) : jobs.length === 0 ? (
                <div className="state">
                  <strong>No positions found</strong>
                  <p>Try another keyword or clear one of the filters.</p>
                </div>
              ) : (
                <div className="job-list">
                  {jobs.map((job) => {
                    const deadlineDays = daysUntil(job.deadline);
                    const deadlineClass = isExpired(job.deadline)
                      ? "expired"
                      : deadlineDays !== null && deadlineDays <= 3
                        ? "soon"
                        : "";

                    return (
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
                        <div className="job-card-top">
                          <div className="company-mark" aria-hidden="true">
                            {(job.company || "D").trim().slice(0, 2).toUpperCase()}
                          </div>

                          <div className="job-card-main">
                            <div className="job-company">{job.company}</div>
                            <div className="job-title">{job.title}</div>
                            <div className="job-meta">
                              <span>{job.location}</span>
                              <span>{JOB_TYPE_LABELS[job.type] || job.type}</span>
                              <span>{timeAgo(job.createdAt)}</span>
                            </div>
                          </div>

                          <div className="job-card-side">
                            <div className="posted">{formatDate(job.createdAt)}</div>
                            {job.deadline && (
                              <div className={`deadline ${deadlineClass}`}>
                                {deadlineLabel(job.deadline)}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="job-card-bottom">
                          <div className="tags">
                            <span className="tag category">{job.category}</span>
                            {job.featured && <span className="tag featured">Featured</span>}
                            <span className="tag">{job.source === "daraja" ? "Daraja" : "External source"}</span>
                          </div>
                          <span className="view-link">View opportunity →</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}

              {pagination.pages > 1 && (
                <nav className="pager" aria-label="Job results pagination">
                  <button
                    className="page-btn"
                    type="button"
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    disabled={page === 1}
                  >
                    ← Previous
                  </button>
                  <span className="page-status" aria-current="page">
                    {page} / {pagination.pages}
                  </span>
                  <button
                    className="page-btn"
                    type="button"
                    onClick={() => setPage((current) => Math.min(pagination.pages, current + 1))}
                    disabled={page === pagination.pages}
                  >
                    Next →
                  </button>
                </nav>
              )}

              <AdSenseSlot
                slot={process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_JOB_LIST_SLOT}
                label="Sponsored job-listing advertisement"
              />

              <JobAlerts />
            </section>
          </div>
        </main>

        <SiteFooter />
      </div>
    </>
  );
}
