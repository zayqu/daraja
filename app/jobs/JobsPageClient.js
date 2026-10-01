"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import AdSenseSlot from "@/components/AdSenseSlot";
import JobAlerts from "@/components/JobAlerts";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import { trackEvent } from "@/lib/analytics";
import { JOB_CATEGORIES } from "@/lib/job-categories";
import {
  buildJobsUrl,
  normalizeJobsSearchParams,
} from "@/lib/job-search";
import styles from "./JobsPageClient.module.css";

export default function JobsPageClient({ showEmployerCta }) {
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
      const initial = normalizeJobsSearchParams(window.location.search);

      setSearch(initial.search);
      setSubmittedSearch(initial.search);
      setCategory(initial.category);
      setStatus(initial.status);
      setPage(initial.page);
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

    window.history.replaceState(
      null,
      "",
      buildJobsUrl({ search: submittedSearch, category, status, page })
    );
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

  function clearFilters() {
    setSearch("");
    setSubmittedSearch("");
    setCategory("");
    setStatus("active");
    setPage(1);
  }

  function formatDate(d) {
    if (!d) return null;
    return new Date(d).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function isExpired(d) {
    return d && new Date(d) < new Date();
  }

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

  const totalJobs = pagination.total || 0;
  const hasFilters = Boolean(
    submittedSearch || category || status !== "active"
  );

  return (
    <div className={styles.page}>
      <SiteNav showEmployerCta={showEmployerCta} />

      <header className={styles.searchHeader}>
        <div className={styles.searchHeaderInner}>
          <p className={styles.eyebrow}>Verified opportunities</p>
          <h1>Find jobs across Tanzania</h1>
          <p className={styles.searchIntro}>
            Search current vacancies by role, employer or keyword, then narrow
            the results by category and status.
          </p>
          <form className={styles.searchForm} onSubmit={handleSearch} role="search">
            <label htmlFor="job-search" className="sr-only">
              Search by job title, company, or keyword
            </label>
            <input
              id="job-search"
              className={styles.searchInput}
              type="search"
              placeholder="Job title, company, or keyword"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <button className={styles.searchButton} type="submit">
              Search jobs
            </button>
          </form>
        </div>
      </header>

      <main className={styles.main} id="main-content">
        <div className={styles.jobsLayout}>
          <aside className={styles.filterPanel} aria-label="Job filters">
            <div className={styles.filterPanelHeading}>
              <div>
                <p className={styles.panelEyebrow}>Refine results</p>
                <h2>Filters</h2>
              </div>
              {hasFilters && (
                <button
                  className={styles.clearButton}
                  type="button"
                  onClick={clearFilters}
                >
                  Clear
                </button>
              )}
            </div>

            <div className={styles.filterGroup}>
              <label className={styles.filterLabel} htmlFor="category-filter">
                Category
              </label>
              <select
                id="category-filter"
                className={styles.filterSelect}
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
                {JOB_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.filterGroup}>
              <label className={styles.filterLabel} htmlFor="status-filter">
                Status
              </label>
              <select
                id="status-filter"
                className={styles.filterSelect}
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

            <p className={styles.filterHint}>
              Results update when you change a filter. Public job browsing stays
              available without an account.
            </p>
          </aside>

          <section className={styles.results} aria-label="Job search results">
            <div className={styles.resultsHeader}>
              <div>
                <p className={styles.panelEyebrow}>Search results</p>
                <h2>
                  {status === "active"
                    ? "Open opportunities"
                    : status === "expired"
                      ? "Expired opportunities"
                      : "All opportunities"}
                </h2>
              </div>
              <div className={styles.resultCount} aria-live="polite">
                {loading
                  ? "Loading jobs..."
                  : `${totalJobs} ${totalJobs === 1 ? "job" : "jobs"}`}
              </div>
            </div>

            {loading ? (
              <div className={styles.stateLoading} role="status">
                Loading jobs...
              </div>
            ) : error ? (
              <div className={styles.stateError} role="alert">
                <p>{error}</p>
                <button
                  className={styles.retryButton}
                  type="button"
                  onClick={fetchJobs}
                >
                  Try again
                </button>
              </div>
            ) : jobs.length === 0 ? (
              <div className={styles.stateEmpty}>
                <strong>No positions found</strong>
                <p>Try a different search term or category.</p>
              </div>
            ) : (
              <div className={styles.jobList}>
                {jobs.map((job) => (
                  <Link
                    key={job.id}
                    href={`/jobs/${job.slug || job.id}`}
                    className={styles.jobCard}
                    onClick={() =>
                      trackEvent("select_item", {
                        item_list_name: "Job search results",
                        items: [
                          {
                            item_id: job.id,
                            item_name: job.title,
                            item_brand: job.company,
                            item_category: job.category,
                          },
                        ],
                      })
                    }
                  >
                    <div className={styles.jobCardMain}>
                      <div className={styles.jobCardBody}>
                        <h3 className={styles.jobTitle}>{job.title}</h3>
                        <p className={styles.jobCompany}>{job.company}</p>
                        <div className={styles.jobTags}>
                          {job.category && (
                            <span className={styles.primaryTag}>{job.category}</span>
                          )}
                          {job.location && (
                            <span className={styles.neutralTag}>{job.location}</span>
                          )}
                          {job.type && (
                            <span className={styles.neutralTag}>
                              {job.type.replace("_", " ")}
                            </span>
                          )}
                          {job.featured && (
                            <span className={styles.featuredTag}>Featured</span>
                          )}
                        </div>
                      </div>

                      <div className={styles.jobCardAside}>
                        <span className={styles.postedAt}>
                          {timeAgo(job.createdAt)}
                        </span>
                        {job.deadline && (
                          <span
                            className={
                              isExpired(job.deadline)
                                ? styles.deadlineExpired
                                : isExpiringSoon(job.deadline)
                                  ? styles.deadlineSoon
                                  : styles.deadline
                            }
                          >
                            {isExpired(job.deadline)
                              ? "Expired"
                              : `Closes ${formatDate(job.deadline)}`}
                          </span>
                        )}
                        <span className={styles.viewJob}>View job →</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>

        <JobAlerts />

        <AdSenseSlot
          slot={process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_JOB_LIST_SLOT}
          label="Sponsored job-listing advertisement"
        />

        {pagination.pages > 1 && (
          <nav className={styles.pager} aria-label="Job results pagination">
            <button
              className={styles.pageButton}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page === 1}
            >
              ← Prev
            </button>
            <span
              className={styles.pageCurrent}
              aria-current="page"
            >
              {page} / {pagination.pages}
            </span>
            <button
              className={styles.pageButton}
              onClick={() =>
                setPage((current) => Math.min(pagination.pages, current + 1))
              }
              disabled={page === pagination.pages}
            >
              Next →
            </button>
          </nav>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
