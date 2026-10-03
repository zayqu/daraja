"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import AdSenseSlot from "@/components/AdSenseSlot";
import JobAlerts from "@/components/JobAlerts";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import JobCard from "@/components/ui/JobCard";
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
  const [filtersOpen, setFiltersOpen] = useState(false);
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
    if (!filtersOpen) return undefined;

    const body = document.body;
    const previousOverflow = body.style.overflow;
    const previousPaddingRight = body.style.paddingRight;
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;

    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }
    body.style.overflow = "hidden";

    function closeOnEscape(event) {
      if (event.key === "Escape") setFiltersOpen(false);
    }
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPaddingRight;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [filtersOpen]);

  useEffect(() => {
    const canonicalUrl = buildJobsUrl({
      search: submittedSearch,
      category,
      location,
      type,
      status,
      page,
    });

    if (skipInitialFetch.current) {
      skipInitialFetch.current = false;
      window.history.replaceState(null, "", canonicalUrl);
      return;
    }

    queueMicrotask(fetchJobs);
    window.history.replaceState(null, "", canonicalUrl);
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
          background: #fbfaf7;
          border-bottom: 1px solid #ebe8e1;
        }

        .jobs-hero-inner {
          max-width: var(--content-max);
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
          color: var(--color-navy);
          font-size: clamp(2rem, 5vw, 3.25rem);
          font-weight: 700;
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
          max-width: var(--content-max);
          margin: 0 auto;
          padding: 2.25rem var(--gutter) var(--section-padding-block);
        }

        .jobs-layout {
          display: grid;
          grid-template-columns: 270px minmax(0, 1fr);
          gap: 1.5rem;
          align-items: start;
        }

        .filters {
          position: sticky;
          top: calc(var(--nav-height) + 1rem);
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

        .filters-head-actions {
          display: flex;
          align-items: center;
          gap: .5rem;
        }

        .filters-handle,
        .filter-close,
        .filter-results-btn,
        .mobile-filter-btn,
        .filters-backdrop {
          display: none;
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

        .results-actions {
          display: flex;
          align-items: center;
          gap: .65rem;
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
            padding: 1.65rem var(--gutter) 1.8rem;
          }

          .jobs-eyebrow {
            font-size: .62rem;
          }

          .jobs-hero h1 {
            margin: .4rem 0 1rem;
            font-size: clamp(1.85rem, 9vw, 2.35rem);
          }

          .search-shell {
            grid-template-columns: 1fr auto;
            gap: .45rem;
            padding: .45rem;
            border-radius: 14px;
          }

          .search-input {
            min-height: 46px;
            padding: 0 .8rem;
          }

          .search-btn {
            min-height: 46px;
            padding: 0 1rem;
            border-radius: 10px;
          }

          .jobs-main {
            padding-top: 1.15rem;
          }

          .filters-backdrop {
            position: fixed;
            inset: 0;
            z-index: 970;
            display: block;
            border: 0;
            background: rgba(15, 23, 42, .34);
            backdrop-filter: blur(4px);
            -webkit-backdrop-filter: blur(4px);
          }

          .filters {
            position: fixed;
            z-index: 980;
            top: 50%;
            left: 50%;
            right: auto;
            bottom: auto;
            width: min(520px, calc(100vw - 32px));
            max-height: calc(100dvh - 32px);
            display: grid;
            overflow-y: auto;
            grid-template-columns: 1fr;
            gap: .8rem;
            padding: 1rem;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(15, 23, 42, .22);
            opacity: 0;
            visibility: hidden;
            pointer-events: none;
            transform: translate(-50%, -48%) scale(.98);
            transition:
              opacity .18s ease,
              transform .18s ease,
              visibility .18s ease;
          }

          .filters-open {
            opacity: 1;
            visibility: visible;
            pointer-events: auto;
            transform: translate(-50%, -50%) scale(1);
          }

          .filters-handle {
            display: none;
          }

          .filter-close,
          .mobile-filter-btn,
          .filter-results-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border: 0;
            font: inherit;
            font-weight: 750;
            cursor: pointer;
          }

          .filter-close {
            min-height: 34px;
            padding: 0 .7rem;
            border-radius: 9px;
            background: #eef2f5;
            color: #344054;
            font-size: .7rem;
          }

          .filter-results-btn {
            min-height: 46px;
            margin-top: .2rem;
            border-radius: 12px;
            background: var(--color-navy);
            color: #fff;
            font-size: .78rem;
          }

          .mobile-filter-btn {
            min-height: 36px;
            padding: 0 .85rem;
            border: 1px solid var(--color-border-strong);
            border-radius: 999px;
            background: #fff;
            color: var(--color-navy);
            font-size: .72rem;
          }

          .results-head {
            min-height: 40px;
            align-items: center;
            flex-direction: row;
            margin-bottom: .75rem;
          }

          .results-actions {
            margin-left: auto;
          }

          .result-context {
            display: none;
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
            {filtersOpen && (
              <button
                type="button"
                className="filters-backdrop"
                aria-label="Close filters"
                onClick={() => setFiltersOpen(false)}
              />
            )}

            <aside className={`filters ${filtersOpen ? "filters-open" : ""}`} aria-label="Job filters">
              <div className="filters-handle" aria-hidden="true" />
              <div className="filters-head">
                <h2>Filter jobs</h2>
                <div className="filters-head-actions">
                  <button type="button" className="clear-btn" onClick={clearFilters}>
                    Clear all
                  </button>
                  <button
                    type="button"
                    className="filter-close"
                    onClick={() => setFiltersOpen(false)}
                  >
                    Done
                  </button>
                </div>
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

              <button
                type="button"
                className="filter-results-btn"
                onClick={() => setFiltersOpen(false)}
              >
                Show {pagination.total || 0} opportunities
              </button>
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
                <div className="results-actions">
                  <button
                    type="button"
                    className="mobile-filter-btn"
                    onClick={() => setFiltersOpen(true)}
                    aria-expanded={filtersOpen}
                  >
                    Filters
                  </button>
                  <div className="result-context">
                    Page {pagination.page || page}{pagination.pages ? ` of ${pagination.pages}` : ""}
                  </div>
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
                  {jobs.map((job) => (
                    <JobCard
                      key={job.id}
                      job={job}
                      listName="Job search results"
                    />
                  ))}
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
