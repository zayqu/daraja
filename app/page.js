import Link from "next/link";
import PublicSiteNav from "@/components/PublicSiteNav";
import { candidateCareerEnabled, employerPortalEnabled } from "@/lib/features";
import SiteFooter from "@/components/SiteFooter";
import { getClosingSoonJobs, getHomeStats, getLatestJobs } from "@/lib/home-stats";
import { getCategoryList } from "@/lib/public-jobs";
import { WHATSAPP_CHANNEL_URL } from "@/lib/site-config";
import JobCard from "@/components/ui/JobCard";
import { getServerT } from "@/lib/i18n-server";
import CategoryIcon, { categoryTone } from "@/components/CategoryIcon";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Busiest categories first so the grid leads with real openings;
// "General" always closes the list.
function orderCategories(categoryList, counts) {
  return categoryList
    .map(({ name, slug, isFallback }, index) => ({ name, slug, isFallback, index, count: counts?.[name] || 0 }))
    .sort((a, b) => {
      if (a.isFallback) return 1;
      if (b.isFallback) return -1;
      return b.count - a.count || a.index - b.index;
    });
}

function formatOpenJobs(count, t) {
  if (!count) return t("New roles soon");
  return t(count === 1 ? "{n} open job" : "{n} open jobs", { n: count.toLocaleString("en-US") });
}

function heroSummary(liveJobs, t) {
  if (!liveJobs) return t("New vacancies across Tanzania every day. Look around, no account needed.");
  return t(liveJobs === 1 ? "{n} job open in Tanzania today. Look around, no account needed." : "{n} jobs open in Tanzania today. Look around, no account needed.", { n: liveJobs.toLocaleString("en-US") });
}

export default async function Home() {
  const employerEnabled = employerPortalEnabled();
  const careerEnabled = candidateCareerEnabled();
  const { t } = await getServerT();
  const [stats, latestJobs, closingSoonJobs, categoryList] = await Promise.all([
    getHomeStats(),
    getLatestJobs(),
    getClosingSoonJobs(),
    getCategoryList(),
  ]);
  const categories = orderCategories(categoryList, stats.categoryCounts);
  const popular = categories.filter((category) => !category.isFallback && category.count > 0).slice(0, 7);
  const newest = latestJobs.slice(0, 3);
  const newestIds = new Set(newest.map((job) => job.id));
  const closingSoon = closingSoonJobs.filter((job) => !newestIds.has(job.id)).slice(0, 3);

  return (
    <>
      <style>{`
        .home { background: var(--color-bg); min-height: 100vh; color: var(--color-text); }

        .hero {
          padding: 2.75rem var(--gutter) 2.25rem;
          background: var(--color-primary-soft);
          border-bottom: 1px solid var(--color-border);
        }

        .hero-inner {
          max-width: var(--content-max);
          margin: 0 auto;
        }

        .discover,
        .section {
          max-width: calc(var(--content-max) + var(--gutter) * 2);
          margin: 0 auto;
        }

        .hero h1 {
          margin: 0;
          color: var(--color-text);
          font-size: clamp(1.75rem, 3.4vw, 2.35rem);
          font-weight: 700;
          line-height: 1.15;
          letter-spacing: -.03em;
        }

        .hero-lead {
          margin: .35rem 0 1.4rem;
          color: var(--color-text-muted);
          font-size: .92rem;
        }

        .hero-search {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(200px, .38fr) auto;
          align-items: center;
          padding: .35rem;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-panel);
          background: var(--color-surface);
          box-shadow: var(--shadow-card);
        }

        .hero-field-wrap {
          position: relative;
          display: flex;
          align-items: center;
          min-width: 0;
        }

        .hero-field-wrap + .hero-field-wrap {
          border-left: 1px solid var(--color-border);
        }

        .hero-field-wrap svg {
          position: absolute;
          left: 1rem;
          width: 17px;
          height: 17px;
          fill: none;
          stroke: var(--color-text-faint);
          stroke-width: 1.8;
          stroke-linecap: round;
          stroke-linejoin: round;
          pointer-events: none;
        }

        .hero-field {
          width: 100%;
          min-height: 48px;
          padding: 0 1rem 0 2.75rem;
          border: 0;
          background: transparent;
          color: var(--color-text);
          outline: none;
          font: inherit;
          font-size: .92rem;
        }

        .hero-field::placeholder { color: var(--color-text-faint); }

        .hero-search:focus-within {
          border-color: var(--color-teal-deep);
          box-shadow: 0 0 0 3px rgba(8, 127, 108, .12), var(--shadow-card);
        }

        .hero-submit {
          min-height: 46px;
          padding: 0 2.1rem;
          border: 0;
          border-radius: 10px;
          background: var(--color-teal-deep);
          color: var(--color-on-dark);
          font: inherit;
          font-size: .9rem;
          font-weight: 600;
          cursor: pointer;
          transition: background .15s ease;
        }

        .hero-submit:hover { filter: brightness(.92); }

        .chips {
          display: flex;
          flex-wrap: wrap;
          gap: .5rem;
          margin-top: 1.1rem;
        }

        .chip {
          display: inline-flex;
          align-items: center;
          min-height: 32px;
          padding: 0 .9rem;
          border: 1px solid var(--color-border-strong);
          border-radius: var(--radius-pill);
          background: var(--color-surface);
          color: var(--color-text-secondary);
          font-size: .78rem;
          font-weight: 500;
          text-decoration: none;
          white-space: nowrap;
          transition: border-color .15s ease, color .15s ease;
        }

        .chip:hover { border-color: var(--color-teal-deep); color: var(--color-link); }

        .chip-active,
        .chip-active:hover {
          border-color: var(--color-teal-deep);
          background: var(--color-teal-deep);
          color: var(--color-on-dark);
        }

        .discover {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 300px;
          gap: 1.5rem;
          align-items: start;
          padding: 1.75rem var(--gutter) var(--section-padding-block);
        }

        .discover-main {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: 2rem;
          min-width: 0;
        }

        .block-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          margin-bottom: .9rem;
        }

        .block-title {
          margin: 0;
          color: var(--color-text);
          font-size: 1.05rem;
          font-weight: 600;
          letter-spacing: -.01em;
        }

        .section-link {
          color: var(--color-link);
          font-size: .8rem;
          font-weight: 600;
          text-decoration: none;
          white-space: nowrap;
        }

        .section-link:hover { text-decoration: underline; }

        .tile-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: .85rem;
        }

        .row-list {
          display: grid;
          gap: .7rem;
        }

        .empty-note {
          padding: 1.5rem;
          border: 1px dashed var(--color-border-strong);
          border-radius: var(--radius-card);
          color: var(--color-text-muted);
          font-size: .85rem;
          text-align: center;
        }

        .aside {
          position: sticky;
          top: calc(var(--nav-height) + 1rem);
          display: grid;
          gap: 1rem;
        }

        .aside-card {
          padding: 1.25rem;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-card);
          background: var(--color-surface);
        }

        .aside-card h2 {
          margin: 0 0 .75rem;
          font-size: .98rem;
          font-weight: 600;
        }

        .perks {
          display: grid;
          gap: .55rem;
          margin: 0 0 1rem;
          padding: 0;
          list-style: none;
          color: var(--color-text-secondary);
          font-size: .82rem;
        }

        .perks li {
          display: flex;
          align-items: center;
          gap: .55rem;
        }

        .perks svg {
          width: 16px;
          height: 16px;
          flex: 0 0 16px;
          fill: var(--color-teal-deep);
        }

        .aside-button {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 42px;
          border-radius: 10px;
          background: var(--color-teal-deep);
          color: var(--color-on-dark);
          font-size: .84rem;
          font-weight: 600;
          text-decoration: none;
        }

        .aside-note {
          margin: .6rem 0 0;
          color: var(--color-text-faint);
          font-size: .72rem;
        }

        .whatsapp-card {
          border-color: transparent;
          background: var(--color-navy);
          color: var(--color-on-dark);
        }

        .whatsapp-card h2 { color: var(--color-on-dark); margin-bottom: .4rem; }

        .whatsapp-card p {
          margin: 0 0 1rem;
          color: rgba(255, 255, 255, .72);
          font-size: .8rem;
          line-height: 1.55;
        }

        .whatsapp-card .aside-button {
          background: var(--color-teal);
          color: var(--color-text);
        }

        .employer-card h2 { margin-bottom: .35rem; }

        .employer-card p {
          margin: 0 0 1rem;
          color: var(--color-text-muted);
          font-size: .8rem;
          line-height: 1.55;
        }

        .employer-card .aside-button {
          border: 1px solid var(--color-text);
          background: var(--color-surface);
          color: var(--color-text);
        }

        .categories {
          background: var(--color-surface);
          border-top: 1px solid var(--color-border);
        }

        .section {
          padding: var(--section-padding-block) var(--gutter);
        }

        .section-head {
          display: flex;
          align-items: end;
          justify-content: space-between;
          gap: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .section-title {
          margin: 0;
          color: var(--color-text);
          font-size: clamp(1.35rem, 2.4vw, 1.7rem);
          font-weight: 600;
          line-height: 1.2;
          letter-spacing: -.02em;
        }

        .section-head p {
          max-width: 420px;
          margin: 0;
          color: var(--color-text-muted);
          font-size: .82rem;
          line-height: 1.6;
        }

        .category-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: .75rem;
        }

        .category-card {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr);
          align-items: center;
          gap: .85rem;
          padding: .85rem 1rem;
          border: 1px solid var(--color-border);
          border-radius: 14px;
          background: var(--color-surface);
          text-decoration: none;
          transition: border-color .15s ease, box-shadow .15s ease;
        }

        .category-card:hover,
        .category-card:focus-visible {
          border-color: var(--color-teal-deep);
          box-shadow: var(--shadow-card);
        }

        .category-icon {
          width: 40px;
          height: 40px;
          display: grid;
          place-items: center;
          border-radius: 10px;
          background: var(--tone-bg);
          color: var(--tone-fg);
        }

        .category-text {
          display: grid;
          gap: .15rem;
          min-width: 0;
        }

        .category-card strong {
          color: var(--color-text);
          font-size: .84rem;
          line-height: 1.3;
          font-weight: 600;
        }

        .category-count {
          color: var(--color-link);
          font-size: .72rem;
          font-weight: 500;
        }

        .category-card.empty .category-count { color: var(--color-text-faint); }

        @media (prefers-reduced-motion: reduce) {
          .chip, .hero-submit, .category-card { transition: none; }
        }

        @media (max-width: 1024px) {
          .discover { grid-template-columns: minmax(0, 1fr); }
          .aside { position: static; grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .category-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        }

        @media (max-width: 640px) {
          .hero {
            padding: 1.25rem var(--gutter) 1.1rem;
          }

          .hero h1 {
            font-size: 1.45rem;
          }

          .hero-lead {
            margin-bottom: 1rem;
            font-size: .82rem;
          }

          .hero-search {
            grid-template-columns: 1fr;
            gap: 0;
            padding: .3rem;
          }

          .hero-field-wrap + .hero-field-wrap {
            border-left: 0;
            border-top: 1px solid var(--color-border);
          }

          .hero-field,
          .hero-submit {
            min-height: 46px;
            font-size: 1rem;
          }

          .hero-submit {
            width: 100%;
            margin-top: .3rem;
          }

          .chips {
            flex-wrap: nowrap;
            overflow-x: auto;
            margin-inline: calc(var(--gutter) * -1);
            padding-inline: var(--gutter);
            scrollbar-width: none;
          }

          .chips::-webkit-scrollbar { display: none; }

          .discover {
            gap: 1.75rem;
            padding-top: 1.25rem;
          }

          .discover-main { gap: 1.5rem; }

          .tile-grid {
            display: flex;
            gap: .7rem;
            overflow-x: auto;
            margin-inline: calc(var(--gutter) * -1);
            padding: 0 var(--gutter) .2rem;
            scroll-snap-type: x mandatory;
            scroll-padding-inline: var(--gutter);
            scrollbar-width: none;
          }

          .tile-grid::-webkit-scrollbar { display: none; }

          .tile-grid > * {
            flex: 0 0 min(250px, 78vw);
            scroll-snap-align: start;
          }

          .aside { grid-template-columns: 1fr; }

          .section-head {
            align-items: flex-start;
            flex-direction: column;
            gap: .5rem;
            margin-bottom: 1rem;
          }

          .category-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: .55rem;
          }

          .category-card {
            grid-template-columns: 1fr;
            gap: .5rem;
            padding: .8rem;
          }

          .category-icon { width: 34px; height: 34px; }
          .category-card strong { font-size: .78rem; }
        }
      `}</style>

      <div className="home">
        <PublicSiteNav />

        <main id="main-content">
          <section className="hero" aria-labelledby="hero-title">
            <div className="hero-inner">
              <h1 id="hero-title">{t("Karibu! Find your next job.")}</h1>
              <p className="hero-lead">{heroSummary(stats.liveJobs, t)}</p>

              <form action="/jobs" method="get" className="hero-search" role="search">
                <div className="hero-field-wrap">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
                  <label className="sr-only" htmlFor="home-search">{t("Job title, company or skill")}</label>
                  <input
                    id="home-search"
                    name="search"
                    type="search"
                    className="hero-field"
                    placeholder={t("Job title, company or skill")}
                  />
                </div>
                <div className="hero-field-wrap">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-6-5.3-6-10a6 6 0 1 1 12 0c0 4.7-6 10-6 10Z" /><circle cx="12" cy="11" r="2.3" /></svg>
                  <label className="sr-only" htmlFor="home-location">{t("Location")}</label>
                  <input
                    id="home-location"
                    name="location"
                    type="search"
                    className="hero-field"
                    placeholder={t("All of Tanzania")}
                  />
                </div>
                <button className="hero-submit" type="submit">{t("Search")}</button>
              </form>

              <nav className="chips" aria-label={t("Popular categories")}>
                <Link className="chip chip-active" href="/jobs">{t("All jobs")}</Link>
                {popular.map((category) => (
                  <Link key={category.name} className="chip" href={`/jobs?category=${encodeURIComponent(category.name)}`}>
                    {t(category.name)}
                  </Link>
                ))}
                <Link className="chip" href="/jobs?type=INTERNSHIP">{t("Internships")}</Link>
              </nav>
            </div>
          </section>

          <div className="discover">
            <div className="discover-main">
              <section aria-labelledby="newest-title">
                <div className="block-head">
                  <h2 className="block-title" id="newest-title">{t("Newest jobs")}</h2>
                  <Link className="section-link" href="/jobs">{t("See all")}</Link>
                </div>
                {newest.length > 0 ? (
                  <div className="tile-grid">
                    {newest.map((job) => (
                      <JobCard key={job.id} job={job} listName="Homepage latest jobs" variant="tile" />
                    ))}
                  </div>
                ) : (
                  <p className="empty-note">{t("New vacancies are on the way. Check back shortly.")}</p>
                )}
              </section>

              {closingSoon.length > 0 && (
                <section aria-labelledby="closing-title">
                  <div className="block-head">
                    <h2 className="block-title" id="closing-title">{t("Closing soon")}</h2>
                    <Link className="section-link" href="/jobs">{t("See all")}</Link>
                  </div>
                  <div className="row-list">
                    {closingSoon.map((job) => (
                      <JobCard key={job.id} job={job} listName="Homepage closing soon" />
                    ))}
                  </div>
                </section>
              )}
            </div>

            <aside className="aside" aria-label={t("Daraja for job seekers")}>
              <section className="aside-card" aria-labelledby="account-title">
                <h2 id="account-title">{t("Make it yours")}</h2>
                <ul className="perks">
                  <li><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm-1.2 14.2-4-4 1.4-1.4 2.6 2.6 5.4-5.4 1.4 1.4-6.8 6.8Z" /></svg>{t("Job alerts in your field")}</li>
                  {careerEnabled && (
                    <>
                      <li><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm-1.2 14.2-4-4 1.4-1.4 2.6 2.6 5.4-5.4 1.4 1.4-6.8 6.8Z" /></svg>{t("Save jobs to your account")}</li>
                      <li><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm-1.2 14.2-4-4 1.4-1.4 2.6 2.6 5.4-5.4 1.4 1.4-6.8 6.8Z" /></svg>{t("Free ATS-ready CV")}</li>
                    </>
                  )}
                </ul>
                <Link className="aside-button" href="/auth/signup">{t("Create free account")}</Link>
                <p className="aside-note">{t("Free for job seekers, always.")}</p>
              </section>

              {WHATSAPP_CHANNEL_URL && (
                <section className="aside-card whatsapp-card" aria-labelledby="whatsapp-title">
                  <h2 id="whatsapp-title">{t("Jobs on WhatsApp")}</h2>
                  <p>{t("New vacancies every day on the DARAJA | Kazi na Fursa Tanzania WhatsApp channel.")}</p>
                  <a className="aside-button" href={WHATSAPP_CHANNEL_URL} target="_blank" rel="noopener noreferrer">
                    {t("Join the channel")}
                  </a>
                </section>
              )}

              {employerEnabled && (
                <section className="aside-card employer-card" aria-labelledby="employer-title">
                  <h2 id="employer-title">{t("Hiring in Tanzania?")}</h2>
                  <p>{t("Publish an opportunity through the Daraja employer workspace.")}</p>
                  <Link className="aside-button" href="/post-job">{t("Post a job")}</Link>
                </section>
              )}
            </aside>
          </div>

          <section className="categories" aria-labelledby="category-title">
            <div className="section">
              <div className="section-head">
                <h2 className="section-title" id="category-title">{t("Browse by category")}</h2>
                <p>{t("Pick your field to see open roles across Tanzania, busiest categories first.")}</p>
              </div>

              <div className="category-grid">
                {categories.map(({ name, slug, index, count }) => {
                  const tone = categoryTone(index);
                  return (
                    <Link
                      key={name}
                      href={"/jobs?category=" + encodeURIComponent(name)}
                      className={`category-card${count ? "" : " empty"}`}
                      style={{ "--tone-bg": tone.bg, "--tone-fg": tone.fg }}
                    >
                      <span className="category-icon">
                        <CategoryIcon category={name} slug={slug} />
                      </span>
                      <span className="category-text">
                        <strong>{t(name)}</strong>
                        <span className="category-count">{formatOpenJobs(count, t)}</span>
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>
        </main>

        <SiteFooter
          platformStats={{
            liveJobs: stats.liveJobs,
            employers: stats.employers,
            sources: stats.sources,
            categories: categoryList.length,
          }}
        />
      </div>
    </>
  );
}
