"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import AdSenseSlot from "@/components/AdSenseSlot";
import JobAlerts from "@/components/JobAlerts";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import JobCard from "@/components/ui/JobCard";
import { useT } from "@/components/LanguageProvider";
import { trackEvent } from "@/lib/analytics";
import { JOB_CATEGORIES } from "@/lib/job-categories";
import {
  JOB_TYPES,
  buildJobsUrl,
} from "@/lib/job-search";

const JOB_TYPE_LABELS = {
  FULL_TIME: "Full time",
  PART_TIME: "Part time",
  CONTRACT: "Contract",
  INTERNSHIP: "Internship",
  FREELANCE: "Freelance",
};

const POPULAR_LOCATIONS = ["Dar es Salaam", "Arusha", "Dodoma", "Mwanza", "Zanzibar", "Mbeya"];

const STATUS_OPTIONS = [
  { value: "active", label: "Open jobs" },
  { value: "expired", label: "Expired jobs" },
  { value: "all", label: "All jobs" },
];

// Compact numbered pager: 1 2 3 … 9, keeping the current page in view.
function pageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);
  const pages = new Set([1, total, current - 1, current, current + 1]);
  if (current <= 3) [2, 3, 4].forEach((value) => pages.add(value));
  if (current >= total - 2) [total - 3, total - 2, total - 1].forEach((value) => pages.add(value));
  const sorted = [...pages].filter((value) => value >= 1 && value <= total).sort((a, b) => a - b);
  return sorted.flatMap((value, index) =>
    index > 0 && value - sorted[index - 1] > 1 ? ["gap-" + value, value] : [value]
  );
}

function subtitleKey(status, one) {
  if (status === "expired") return one ? "{n} expired vacancy" : "{n} expired vacancies";
  if (status === "all") return one ? "{n} vacancy" : "{n} vacancies";
  return one ? "{n} open vacancy" : "{n} open vacancies";
}

function resultsKey(status) {
  if (status === "expired") return "Showing {from}–{to} of {n} expired jobs";
  if (status === "all") return "Showing {from}–{to} of {n} jobs";
  return "Showing {from}–{to} of {n} open jobs";
}

function FilterOption({ name, checked, onChange, children }) {
  return (
    <label className={`filter-option${checked ? " is-checked" : ""}`}>
      <input type="radio" name={name} checked={checked} onChange={onChange} />
      <span className="filter-check" aria-hidden="true" />
      <span>{children}</span>
    </label>
  );
}

export default function JobsPageClient({
  showEmployerCta,
  showCandidateCv,
  initialJobs,
  initialPagination,
  initialFilters,
  initialError = "",
  categories = JOB_CATEGORIES,
}) {
  const t = useT();
  const [jobs, setJobs] = useState(initialJobs);
  const [pagination, setPagination] = useState(initialPagination);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initialError);

  const [search, setSearch] = useState(initialFilters.search);
  const [submittedSearch, setSubmittedSearch] = useState(initialFilters.search);
  const [category, setCategory] = useState(initialFilters.category);
  const [location, setLocation] = useState(initialFilters.location);
  const [locationDraft, setLocationDraft] = useState(initialFilters.location);
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
    setLocation(locationDraft.trim());
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
    setLocationDraft("");
    setType("");
    setStatus("active");
    setPage(1);
  }


  function chooseLocation(value) {
    setLocation(value);
    setLocationDraft(value);
    setPage(1);
  }

  const totalPages = pagination.pages || 0;
  const currentPage = pagination.page || page;
  const pageSize = pagination.limit || 20;
  const firstShown = pagination.total ? (currentPage - 1) * pageSize + 1 : 0;
  const lastShown = Math.min(currentPage * pageSize, pagination.total || 0);

  return (
    <>
      <style>{`
        .jobs-page {
          min-height: 100vh;
          background: var(--color-bg);
          color: var(--color-text);
        }

        .jobs-hero {
          padding: 1.25rem var(--gutter) 1.75rem;
          background: var(--color-surface);
          border-bottom: 1px solid var(--color-border);
        }

        .jobs-hero-inner {
          max-width: var(--content-max);
          margin: 0 auto;
        }

        .crumbs {
          display: flex;
          gap: .4rem;
          margin-bottom: 1rem;
          color: var(--color-text-faint);
          font-size: .74rem;
        }

        .crumbs a { color: inherit; text-decoration: none; }
        .crumbs a:hover { color: var(--color-link); }

        .jobs-title-row {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 1rem;
          margin-bottom: 1.1rem;
        }

        .jobs-hero h1 {
          margin: 0;
          color: var(--color-text);
          font-size: clamp(1.6rem, 3vw, 2.1rem);
          font-weight: 700;
          line-height: 1.15;
          letter-spacing: -.03em;
        }

        .jobs-subtitle {
          margin: .25rem 0 0;
          color: var(--color-text-muted);
          font-size: .85rem;
        }

        .alert-link {
          display: inline-flex;
          align-items: center;
          gap: .4rem;
          min-height: 36px;
          padding: 0 .9rem;
          border: 1px solid var(--color-border-strong);
          border-radius: 10px;
          background: var(--color-surface);
          color: var(--color-text);
          font-size: .78rem;
          font-weight: 500;
          text-decoration: none;
          white-space: nowrap;
        }

        .alert-link svg,
        .search-field svg {
          width: 16px;
          height: 16px;
          fill: none;
          stroke: currentColor;
          stroke-width: 1.8;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        .alert-link:hover { border-color: var(--color-teal-deep); color: var(--color-link); }

        .search-shell {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(180px, .4fr) auto;
          align-items: center;
          padding: .3rem;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-panel);
          background: var(--color-surface);
          box-shadow: var(--shadow-card);
        }

        .search-shell:focus-within {
          border-color: var(--color-teal-deep);
          box-shadow: 0 0 0 3px rgba(8, 127, 108, .12), var(--shadow-card);
        }

        .search-field {
          position: relative;
          display: flex;
          align-items: center;
          min-width: 0;
        }

        .search-field + .search-field { border-left: 1px solid var(--color-border); }

        .search-field svg {
          position: absolute;
          left: .95rem;
          color: var(--color-text-faint);
          pointer-events: none;
        }

        .search-input {
          width: 100%;
          min-width: 0;
          min-height: 46px;
          padding: 0 .9rem 0 2.6rem;
          border: 0;
          background: transparent;
          color: var(--color-text);
          font: inherit;
          font-size: .9rem;
          outline: 0;
        }

        .search-btn {
          min-height: 44px;
          padding: 0 1.9rem;
          border: 0;
          border-radius: 10px;
          background: var(--color-teal-deep);
          color: var(--color-on-dark);
          font: inherit;
          font-size: .88rem;
          font-weight: 600;
          cursor: pointer;
        }

        .search-btn:hover { filter: brightness(.92); }

        .jobs-main {
          max-width: calc(var(--content-max) + var(--gutter) * 2);
          margin: 0 auto;
          padding: 1.5rem var(--gutter) var(--section-padding-block);
        }

        .jobs-layout {
          display: grid;
          grid-template-columns: 240px minmax(0, 1fr);
          gap: 1.25rem;
          align-items: start;
        }

        .filters {
          position: sticky;
          top: calc(var(--nav-height) + 1rem);
          padding: 1.1rem;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-card);
          background: var(--color-surface);
        }

        .filters-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: .75rem;
          margin-bottom: .9rem;
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
          margin: 0;
          font-size: .95rem;
          font-weight: 600;
        }

        .clear-btn {
          border: 0;
          background: transparent;
          color: var(--color-link);
          font: inherit;
          font-size: .74rem;
          font-weight: 600;
          cursor: pointer;
        }

        .filter-group {
          margin: 0;
          padding: 0;
          border: 0;
        }

        .filter-group + .filter-group {
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid var(--color-border);
        }

        .filter-label {
          display: block;
          margin-bottom: .5rem;
          padding: 0;
          color: var(--color-text-muted);
          font-size: .66rem;
          font-weight: 600;
          letter-spacing: .08em;
          text-transform: uppercase;
        }

        .filter-option {
          position: relative;
          display: flex;
          align-items: center;
          gap: .6rem;
          min-height: 30px;
          color: var(--color-text-secondary);
          font-size: .8rem;
          cursor: pointer;
        }

        .filter-option input {
          position: absolute;
          opacity: 0;
          pointer-events: none;
        }

        .filter-check {
          width: 16px;
          height: 16px;
          flex: 0 0 16px;
          border: 1.5px solid var(--color-border-strong);
          border-radius: 5px;
          background: var(--color-surface);
        }

        .filter-option.is-checked { color: var(--color-text); font-weight: 500; }

        .filter-option.is-checked .filter-check {
          border-color: var(--color-teal-deep);
          background:
            url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='m4 8 2.5 2.5L12 5' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")
            center / 12px no-repeat,
            var(--color-teal-deep);
        }

        .filter-option input:focus-visible + .filter-check {
          outline: 3px solid rgba(8, 127, 108, .25);
          outline-offset: 2px;
        }

        .filter-control {
          width: 100%;
          min-height: 40px;
          padding: 0 .7rem;
          border: 1px solid var(--color-border-strong);
          border-radius: 10px;
          background: var(--color-surface);
          color: var(--color-text);
          font: inherit;
          font-size: .8rem;
          outline: 0;
        }

        .filter-control:focus { border-color: var(--color-teal-deep); }

        .results { min-width: 0; }

        .results-head {
          min-height: 36px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          margin-bottom: .75rem;
        }

        .results-count {
          color: var(--color-text-muted);
          font-size: .8rem;
        }

        .results-count strong { color: var(--color-text); font-weight: 600; }

        .results-actions {
          display: flex;
          align-items: center;
          gap: .65rem;
        }

        .result-context {
          color: var(--color-text-faint);
          font-size: .74rem;
        }

        .job-list {
          display: flex;
          flex-direction: column;
          gap: .7rem;
        }

        .state {
          padding: 4rem 1rem;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-card);
          background: var(--color-surface);
          color: var(--color-text-muted);
          text-align: center;
        }

        .state strong {
          display: block;
          margin-bottom: .35rem;
          color: var(--color-text);
          font-size: 1rem;
        }

        .state.error { color: var(--color-danger); }

        .retry-btn {
          margin-top: 1rem;
          padding: .65rem 1rem;
          border: 0;
          border-radius: 10px;
          background: var(--color-text);
          color: var(--color-surface);
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
          min-width: 36px;
          min-height: 36px;
          padding: 0 .6rem;
          border: 1px solid var(--color-border-strong);
          border-radius: 9px;
          background: var(--color-surface);
          color: var(--color-text-secondary);
          font: inherit;
          font-size: .8rem;
          cursor: pointer;
        }

        .page-btn:hover:not(:disabled) { border-color: var(--color-teal-deep); color: var(--color-link); }
        .page-btn:disabled { opacity: .35; cursor: not-allowed; }

        .page-btn[aria-current="page"] {
          border-color: var(--color-teal-deep);
          background: var(--color-teal-deep);
          color: var(--color-on-dark);
          font-weight: 600;
        }

        .page-gap {
          color: var(--color-text-faint);
          font-size: .8rem;
        }

        @media (max-width: 820px) {
          .jobs-layout { grid-template-columns: minmax(0, 1fr); }

          .filters {
            position: static;
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: .9rem;
          }

          .filters-head { grid-column: 1 / -1; margin-bottom: 0; }

          .filter-group + .filter-group {
            margin-top: 0;
            padding-top: 0;
            border-top: 0;
          }
        }

        @media (max-width: 640px) {
          .jobs-hero { padding: .9rem var(--gutter) 1.1rem; }
          .crumbs { display: none; }
          .jobs-title-row { margin-bottom: .85rem; }
          .jobs-hero h1 { font-size: 1.45rem; }
          .jobs-subtitle { font-size: .78rem; }

          .alert-link span { display: none; }
          .alert-link { width: 36px; padding: 0; justify-content: center; }

          .search-shell {
            grid-template-columns: 1fr;
            padding: .3rem;
          }

          .search-field + .search-field {
            border-left: 0;
            border-top: 1px solid var(--color-border);
          }

          .search-input,
          .search-btn {
            min-height: 44px;
            font-size: 1rem;
          }

          .search-btn { width: 100%; margin-top: .3rem; }

          .jobs-main { padding-top: 1rem; }

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

          .filter-group + .filter-group {
            padding-top: .8rem;
            border-top: 1px solid var(--color-border);
          }

          .filter-close,
          .mobile-filter-btn,
          .filter-results-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: .4rem;
            border: 0;
            font: inherit;
            font-weight: 600;
            cursor: pointer;
          }

          .filter-close {
            min-height: 32px;
            padding: 0 .75rem;
            border-radius: 9px;
            background: var(--color-surface-muted);
            color: var(--color-text-secondary);
            font-size: .72rem;
          }

          .filter-results-btn {
            min-height: 46px;
            margin-top: .2rem;
            border-radius: 12px;
            background: var(--color-teal-deep);
            color: var(--color-on-dark);
            font-size: .82rem;
          }

          .mobile-filter-btn {
            min-height: 34px;
            padding: 0 .85rem;
            border: 1px solid var(--color-border-strong);
            border-radius: var(--radius-pill);
            background: var(--color-surface);
            color: var(--color-text);
            font-size: .74rem;
          }

          .result-context { display: none; }
          .results-actions { margin-left: auto; }
        }

        @media (prefers-reduced-motion: reduce) {
          .filters { transition: none; }
        }
      `}</style>

      <div className="jobs-page">
        <SiteNav showEmployerCta={showEmployerCta} showCandidateProfile={showCandidateCv} />

        <header className="jobs-hero">
          <div className="jobs-hero-inner">
            <nav className="crumbs" aria-label={t("Breadcrumb")}>
              <Link href="/">{t("Home")}</Link>
              <span aria-hidden="true">/</span>
              <span>{t("Jobs")}</span>
            </nav>

            <div className="jobs-title-row">
              <div>
                <h1>{t("Jobs in Tanzania")}</h1>
                <p className="jobs-subtitle">
                  {pagination.total
                    ? t(subtitleKey(status, pagination.total === 1), { n: pagination.total.toLocaleString("en-US") })
                    : t("Current vacancies from verified sources")}
                </p>
              </div>
              <a className="alert-link" href="#job-alerts-title" aria-label={t("Create job alert")}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0" /></svg>
                <span>{t("Create job alert")}</span>
              </a>
            </div>

            <form className="search-shell" onSubmit={handleSearch} role="search">
              <div className="search-field">
                <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
                <label htmlFor="job-search" className="sr-only">
                  {t("Search by job title, company, or skill")}
                </label>
                <input
                  id="job-search"
                  className="search-input"
                  type="search"
                  placeholder={t("Job title, company or skill")}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
              <div className="search-field">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-6-5.3-6-10a6 6 0 1 1 12 0c0 4.7-6 10-6 10Z" /><circle cx="12" cy="11" r="2.3" /></svg>
                <label htmlFor="location-search" className="sr-only">{t("Location")}</label>
                <input
                  id="location-search"
                  className="search-input"
                  type="search"
                  placeholder={t("All of Tanzania")}
                  value={locationDraft}
                  onChange={(event) => setLocationDraft(event.target.value)}
                />
              </div>
              <button className="search-btn" type="submit">{t("Search")}</button>
            </form>
          </div>
        </header>

        <main className="jobs-main" id="main-content">
          <div className="jobs-layout">
            {filtersOpen && (
              <button
                type="button"
                className="filters-backdrop"
                aria-label={t("Close filters")}
                onClick={() => setFiltersOpen(false)}
              />
            )}

            <aside className={`filters ${filtersOpen ? "filters-open" : ""}`} aria-label={t("Job filters")}>
              <div className="filters-handle" aria-hidden="true" />
              <div className="filters-head">
                <h2>{t("Filters")}</h2>
                <div className="filters-head-actions">
                  <button type="button" className="clear-btn" onClick={clearFilters}>
                    {t("Clear all")}
                  </button>
                  <button
                    type="button"
                    className="filter-close"
                    onClick={() => setFiltersOpen(false)}
                  >
                    {t("Done")}
                  </button>
                </div>
              </div>

              <fieldset className="filter-group">
                <legend className="filter-label">{t("Job type")}</legend>
                <FilterOption name="type" checked={!type} onChange={() => { setType(""); setPage(1); }}>
                  {t("All job types")}
                </FilterOption>
                {JOB_TYPES.map((item) => (
                  <FilterOption
                    key={item}
                    name="type"
                    checked={type === item}
                    onChange={() => { setType(item); setPage(1); }}
                  >
                    {t(JOB_TYPE_LABELS[item])}
                  </FilterOption>
                ))}
              </fieldset>

              <fieldset className="filter-group">
                <legend className="filter-label">{t("Location")}</legend>
                <FilterOption name="location" checked={!location} onChange={() => chooseLocation("")}>
                  {t("All of Tanzania")}
                </FilterOption>
                {[...new Set([...POPULAR_LOCATIONS, ...(location ? [location] : [])])].map((item) => (
                  <FilterOption
                    key={item}
                    name="location"
                    checked={location === item}
                    onChange={() => chooseLocation(item)}
                  >
                    {item}
                  </FilterOption>
                ))}
              </fieldset>

              <div className="filter-group">
                <label className="filter-label" htmlFor="category-filter">{t("Category")}</label>
                <select
                  id="category-filter"
                  className="filter-control"
                  value={category}
                  onChange={(event) => {
                    setCategory(event.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">{t("All categories")}</option>
                  {categories.map((item) => (
                    <option key={item} value={item}>{t(item)}</option>
                  ))}
                </select>
              </div>

              <fieldset className="filter-group">
                <legend className="filter-label">{t("Status")}</legend>
                {STATUS_OPTIONS.map((item) => (
                  <FilterOption
                    key={item.value}
                    name="status"
                    checked={status === item.value}
                    onChange={() => { setStatus(item.value); setPage(1); }}
                  >
                    {t(item.label)}
                  </FilterOption>
                ))}
              </fieldset>

              <button
                type="button"
                className="filter-results-btn"
                onClick={() => setFiltersOpen(false)}
              >
                {t("Show {n} opportunities", { n: pagination.total || 0 })}
              </button>
            </aside>

            <section className="results" aria-label={t("Job search results")}>
              <div className="results-head">
                <div className="results-count" aria-live="polite">
                  {loading ? (
                    t("Loading opportunities...")
                  ) : pagination.total ? (
                    t(resultsKey(status), { from: firstShown, to: lastShown, n: pagination.total.toLocaleString("en-US") })
                  ) : (
                    t(resultsKey(status), { from: 0, to: 0, n: 0 })
                  )}
                </div>
                <div className="results-actions">
                  <button
                    type="button"
                    className="mobile-filter-btn"
                    onClick={() => setFiltersOpen(true)}
                    aria-expanded={filtersOpen}
                  >
                    {t("Filters")}
                  </button>
                  <div className="result-context">{t("Newest first")}</div>
                </div>
              </div>

              {loading ? (
                <div className="state" role="status">{t("Loading jobs...")}</div>
              ) : error ? (
                <div className="state error" role="alert">
                  <strong>{t("Jobs did not load")}</strong>
                  <p>{t(error)}</p>
                  <button className="retry-btn" type="button" onClick={fetchJobs}>{t("Try again")}</button>
                </div>
              ) : jobs.length === 0 ? (
                <div className="state">
                  <strong>{t("No positions found")}</strong>
                  <p>{t("Try another keyword or clear one of the filters.")}</p>
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

              {totalPages > 1 && (
                <nav className="pager" aria-label={t("Job results pagination")}>
                  <button
                    className="page-btn"
                    type="button"
                    aria-label={t("Previous page")}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    disabled={page === 1}
                  >
                    ←
                  </button>
                  {pageNumbers(page, totalPages).map((item) =>
                    typeof item === "string" ? (
                      <span key={item} className="page-gap" aria-hidden="true">…</span>
                    ) : (
                      <button
                        key={item}
                        className="page-btn"
                        type="button"
                        aria-current={item === page ? "page" : undefined}
                        onClick={() => setPage(item)}
                      >
                        {item}
                      </button>
                    )
                  )}
                  <button
                    className="page-btn"
                    type="button"
                    aria-label={t("Next page")}
                    onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                    disabled={page === totalPages}
                  >
                    →
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
