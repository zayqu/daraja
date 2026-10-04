import Link from "next/link";
import JobAlerts from "@/components/JobAlerts";
import PublicSiteNav from "@/components/PublicSiteNav";
import { employerPortalEnabled } from "@/lib/features";
import { JOB_CATEGORIES } from "@/lib/job-categories";
import SiteFooter from "@/components/SiteFooter";
import HomeHeroBridge from "@/components/HomeHeroBridge";
import { getHomeStats } from "@/lib/home-stats";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const HERO_HEADLINE = [
  { word: "Find" },
  { word: "work" },
  { word: "that" },
  { word: "moves", accent: true },
  { word: "you", accent: true },
  { word: "forward.", accent: true, underline: true },
];

const FEATURED_CATEGORIES = new Set([
  "Government",
  "NGO & Development",
  "Banking & Finance",
  "Technology",
  "Health",
  "Education",
  "HR & Administration",
  "Internships & Graduate Programs",
]);

export default async function Home() {
  const employerEnabled = employerPortalEnabled();
  const stats = await getHomeStats();

  return (
    <>
      <style>{`
        .home { background: var(--color-bg); min-height: 100vh; color: var(--color-navy); }

        .hero {
          position: relative;
          overflow: hidden;
          padding: 5rem var(--gutter) 5.25rem;
          background: var(--color-surface-warm);
          border-bottom: 1px solid var(--color-border-warm);
        }

        .hero-inner {
          max-width: var(--content-max);
          margin: 0 auto;
          position: relative;
          z-index: 1;
        }

        .hero-layout {
          display: grid;
          grid-template-columns: minmax(0, 1.55fr) minmax(300px, .85fr);
          align-items: center;
          gap: clamp(2rem, 5vw, 4.5rem);
          margin-bottom: 2.25rem;
        }

        .hero-copy {
          max-width: 680px;
        }

        .hero-eyebrow,
        .section-kicker {
          color: var(--color-teal);
          font-size: .7rem;
          font-weight: 700;
          letter-spacing: .16em;
          text-transform: uppercase;
        }

        .hero h1 {
          max-width: 760px;
          margin: .8rem 0 1rem;
          color: #1b1f23;
          font-size: clamp(2.55rem, 5.8vw, 4.65rem);
          font-weight: 700;
          line-height: .98;
          letter-spacing: -.045em;
        }

        .hero h1 .hero-word {
          display: inline-block;
          animation: hero-word-rise .7s cubic-bezier(.22, 1, .36, 1) backwards;
        }

        .hero h1 .hero-accent { color: var(--color-teal); }

        .hero h1 .hero-underline {
          position: relative;
        }

        .hero h1 .hero-underline::after {
          content: "";
          position: absolute;
          left: 0;
          right: .12em;
          bottom: -.04em;
          height: .07em;
          border-radius: 999px;
          background: var(--color-teal);
          opacity: .45;
          transform-origin: left center;
          animation: hero-underline-draw .5s cubic-bezier(.65, 0, .35, 1) 1.15s backwards;
        }

        .hero-eyebrow { animation: hero-fade-up .6s ease-out .05s backwards; }
        .hero-lead { animation: hero-fade-up .6s ease-out .65s backwards; }
        .hero-search { animation: hero-fade-up .6s ease-out .9s backwards; }
        .quick-links { animation: hero-fade-up .5s ease-out 1.3s backwards; }

        .hero-submit {
          position: relative;
          overflow: hidden;
        }

        .hero-submit::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(100deg, transparent 30%, rgba(255,255,255,.55) 50%, transparent 70%);
          transform: translateX(-120%);
          animation: hero-shine .8s ease-in-out 3.9s 1;
          pointer-events: none;
        }

        @keyframes hero-word-rise {
          from { transform: translateY(.35em); }
        }

        @keyframes hero-underline-draw {
          from { transform: scaleX(0); }
        }

        @keyframes hero-fade-up {
          from { opacity: 0; transform: translateY(14px); }
        }

        @keyframes hero-shine {
          to { transform: translateX(120%); }
        }

        @keyframes hero-mobile-enter {
          from { opacity: 0; transform: translateY(10px); }
        }

        @media (prefers-reduced-motion: reduce) {
          .hero *,
          .hero *::before,
          .hero *::after {
            animation: none !important;
          }
        }

        .hero-lead {
          max-width: 620px;
          color: var(--color-text-muted);
          font-size: 1rem;
          line-height: 1.7;
        }

        .hero-search {
          display: grid;
          grid-template-columns: minmax(0, 1.7fr) minmax(220px, .8fr) auto;
          gap: .65rem;
          max-width: 960px;
          padding: .7rem;
          border-radius: 18px;
          background: var(--color-surface);
          border: 1px solid #e4e1da;
          box-shadow: 0 18px 45px rgba(27, 31, 35, .08);
        }

        .hero-field {
          min-height: 54px;
          width: 100%;
          border: 1px solid #e5e9ef;
          border-radius: 12px;
          background: var(--color-surface);
          color: var(--color-navy);
          padding: 0 1rem;
          outline: none;
          font: inherit;
          font-size: 1rem;
        }

        .hero-field:focus {
          border-color: var(--color-teal);
          box-shadow: 0 0 0 3px rgba(0,201,167,.08);
        }

        .hero-submit {
          min-height: 54px;
          padding: 0 1.6rem;
          border: 0;
          border-radius: 12px;
          background: var(--color-teal);
          color: var(--color-navy);
          font-weight: 800;
          cursor: pointer;
        }

        .quick-links {
          display: flex;
          flex-wrap: wrap;
          gap: .55rem 1rem;
          margin-top: 1rem;
          color: #98a2b3;
          font-size: .75rem;
        }

        .quick-links a {
          color: #475467;
          text-decoration: none;
        }

        .quick-links a:hover { color: var(--color-teal); }


        .trust {
          background: var(--color-navy);
          border-bottom: 0;
        }

        .trust-inner {
          max-width: var(--content-max);
          margin: 0 auto;
          padding: 1.5rem var(--gutter);
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
        }

        .trust-item {
          padding-right: 1rem;
          border-right: 1px solid rgba(255,255,255,.16);
        }

        .trust-item:last-child { border-right: 0; }

        .trust-item strong {
          display: block;
          margin-bottom: .12rem;
          color: var(--color-on-dark);
          font-size: clamp(1.15rem, 2vw, 1.55rem);
          font-weight: 800;
          letter-spacing: -.02em;
        }

        .trust-item span {
          color: rgba(255,255,255,.72);
          font-size: .7rem;
          line-height: 1.45;
        }

        .section {
          max-width: var(--content-max);
          margin: 0 auto;
          padding: var(--section-padding-block) var(--gutter);
        }

        .section-head {
          display: flex;
          align-items: end;
          justify-content: space-between;
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .section-title {
          margin-top: .45rem;
          color: var(--color-navy);
          font-size: clamp(1.7rem, 3vw, 2.2rem);
          font-weight: 700;
          line-height: 1.15;
          letter-spacing: -.03em;
        }

        .section-head p {
          max-width: 470px;
          color: #7a8492;
          font-size: .84rem;
          line-height: 1.65;
        }

        .category-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 1rem;
        }

        .category-card {
          min-height: 138px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 1.35rem;
          border: 1px solid var(--color-border-strong);
          border-radius: 16px;
          background: var(--color-surface);
          text-decoration: none;
          transition: transform .15s ease, border-color .15s ease, box-shadow .15s ease;
        }

        .category-card:hover {
          transform: translateY(-2px);
          border-color: var(--color-teal);
          box-shadow: var(--shadow-card);
        }

        .category-card.featured {
          border-color: rgba(0,201,167,.38);
          background: #f4fffc;
        }

        .category-card strong {
          color: var(--color-navy);
          font-size: .9rem;
          line-height: 1.35;
        }

        .category-card span {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: .75rem;
          color: var(--color-text-faint);
          font-size: .7rem;
        }

        .category-card span b {
          color: var(--color-teal-deep);
          font-size: 1rem;
          font-weight: 500;
        }

        .how {
          background: var(--color-surface);
          border-top: 1px solid var(--color-border);
          border-bottom: 1px solid var(--color-border);
        }

        .how-grid {
          margin-top: 2rem;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
        }

        .how-card {
          padding: 1.6rem;
          border: 1px solid var(--color-border);
          border-radius: 16px;
          background: #f9fafb;
        }

        .how-num {
          width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          margin-bottom: 1rem;
          border-radius: 50%;
          background: var(--color-navy);
          color: var(--color-teal);
          font-size: .75rem;
          font-weight: 800;
        }

        .how-card h3 {
          margin-bottom: .45rem;
          font-size: 1rem;
        }

        .how-card p {
          color: #7a8492;
          font-size: .8rem;
          line-height: 1.65;
        }

        .employer-strip {
          max-width: var(--content-max);
          margin: 0 auto var(--section-padding-block);
          padding: 0 var(--gutter);
        }

        .employer-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 2rem;
          padding: 2rem;
          border-radius: 18px;
          background: var(--color-navy);
        }

        .employer-card h2 {
          color: var(--color-on-dark);
          font-size: 1.35rem;
          margin-bottom: .35rem;
        }

        .employer-card p {
          color: rgba(255,255,255,.55);
          font-size: .82rem;
        }

        .employer-card a {
          flex-shrink: 0;
          padding: .8rem 1.25rem;
          border-radius: 12px;
          background: var(--color-teal);
          color: var(--color-navy);
          font-size: .8rem;
          font-weight: 800;
          text-decoration: none;
        }

        @media (max-width: 900px) {
          .hero-layout { display: block; }
          .hero-search { grid-template-columns: 1fr 1fr; }
          .hero-submit { grid-column: 1 / -1; }
          .category-grid { grid-template-columns: repeat(3, 1fr); }
        }

        @media (max-width: 640px) {
          .hero {
            padding: 2rem var(--gutter) 2.4rem;
            background: var(--color-surface-warm);
          }

          .hero-inner {
            width: 100%;
            max-width: 100%;
          }

          .hero-layout {
            margin-bottom: 1.15rem;
          }

          .hero-copy {
            max-width: none;
            animation: hero-mobile-enter .5s ease-out both;
          }

          .hero-eyebrow,
          .section-kicker {
            font-size: .62rem;
          }

          .hero h1 {
            max-width: 100%;
            margin: .5rem 0 .8rem;
            font-size: clamp(2.05rem, 9vw, 2.4rem);
            font-weight: 700;
            line-height: 1.02;
            letter-spacing: -.04em;
          }

          .hero h1 .hero-word {
            animation: none !important;
          }

          .hero h1 .hero-underline::after {
            animation-delay: .3s;
          }

          .hero-lead {
            max-width: 34rem;
            font-size: .88rem;
            line-height: 1.5;
          }

          .hero-search {
            width: 100%;
            grid-template-columns: 1fr;
            gap: .5rem;
            padding: .5rem;
            border-radius: 16px;
            box-shadow: 0 10px 28px rgba(27, 31, 35, .08);
          }

          .hero-field,
          .hero-submit {
            min-height: 48px;
            border-radius: 11px;
            font-size: 1rem;
          }

          .hero-field {
            padding-inline: .9rem;
          }

          .hero-submit {
            grid-column: auto;
            width: 100%;
            padding-inline: 1rem;
          }

          .quick-links {
            flex-wrap: nowrap;
            gap: .75rem;
            overflow-x: auto;
            padding-bottom: .2rem;
            scrollbar-width: none;
          }

          .quick-links::-webkit-scrollbar {
            display: none;
          }

          .quick-links span,
          .quick-links a {
            flex: 0 0 auto;
          }


          .trust-inner {
            grid-template-columns: repeat(3, 1fr);
            gap: 0;
            padding-top: .9rem;
            padding-bottom: .9rem;
          }

          .trust-item {
            min-height: 66px;
            padding: .75rem .7rem;
            border-right: 1px solid rgba(255,255,255,.14);
          }

          .trust-item:last-child {
            border-right: 0;
          }

          .trust-item strong {
            font-size: 1.12rem;
          }

          .trust-item span {
            font-size: .66rem;
            line-height: 1.45;
          }

          .section {
            padding-top: var(--section-padding-block);
            padding-bottom: var(--section-padding-block);
          }

          .section-head {
            align-items: flex-start;
            flex-direction: column;
            gap: .75rem;
            margin-bottom: 1rem;
          }

          .section-title {
            font-size: 1.55rem;
          }

          .section-head p {
            font-size: .78rem;
            line-height: 1.55;
          }

          .category-grid {
            display: flex;
            gap: .7rem;
            margin-right: calc(var(--gutter) * -1);
            overflow-x: auto;
            padding-right: var(--gutter);
            scroll-snap-type: x proximity;
            scrollbar-width: none;
          }

          .category-grid::-webkit-scrollbar {
            display: none;
          }

          .category-card {
            flex: 0 0 164px;
            min-height: 106px;
            padding: .9rem;
            border-radius: 14px;
            scroll-snap-align: start;
          }

          .category-card strong {
            font-size: .82rem;
          }

          .how-grid {
            grid-template-columns: 1fr;
            gap: .7rem;
          }

          .how-card {
            padding: 1.15rem;
            border-radius: 14px;
          }

          .how-num {
            width: 30px;
            height: 30px;
            margin-bottom: .75rem;
          }

          .employer-strip {
            margin-bottom: 2.5rem;
          }

          .employer-card {
            align-items: flex-start;
            flex-direction: column;
            gap: 1rem;
            padding: 1.35rem;
            border-radius: 14px;
          }

          .employer-card a {
            width: 100%;
            text-align: center;
          }
        }
      `}</style>

      <div className="home">
        <PublicSiteNav />

        <main id="main-content">
          <section className="hero">
            <div className="hero-inner">
              <div className="hero-layout">
                <div className="hero-copy">
                  <div className="hero-eyebrow">Kazi na fursa Tanzania</div>
                  <h1>
                    {HERO_HEADLINE.map(({ word, accent, underline }, index) => (
                      <span
                        key={word}
                        className={[
                          "hero-word",
                          accent && "hero-accent",
                          underline && "hero-underline",
                        ].filter(Boolean).join(" ")}
                        style={{ animationDelay: `${0.15 + index * 0.08}s` }}
                      >
                        {word}
                      </span>
                    )).reduce((line, word) => (line.length ? [...line, " ", word] : [word]), [])}
                  </h1>
                  <p className="hero-lead">
                    Search current opportunities from government, NGOs, banks,
                    companies and institutions across Tanzania.
                  </p>
                </div>

                <HomeHeroBridge />
              </div>

              <form action="/jobs" method="get" className="hero-search" role="search">
                <label className="sr-only" htmlFor="home-search">Job title, company or keyword</label>
                <input
                  id="home-search"
                  name="search"
                  type="search"
                  className="hero-field"
                  placeholder="Job title, company or keyword"
                />

                <label className="sr-only" htmlFor="home-category">Category</label>
                <select id="home-category" name="category" className="hero-field" defaultValue="">
                  <option value="">All categories</option>
                  {JOB_CATEGORIES.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>

                <button className="hero-submit" type="submit">Find jobs</button>
              </form>

              <div className="quick-links">
                <span>Popular:</span>
                <Link href="/jobs?category=Government">Government</Link>
                <Link href="/jobs?category=NGO%20%26%20Development">NGO</Link>
                <Link href="/jobs?category=Banking%20%26%20Finance">Banking</Link>
                <Link href="/jobs?category=Internships%20%26%20Graduate%20Programs">Internships</Link>
              </div>
            </div>
          </section>

          <section className="trust" aria-label="Daraja live platform counters">
            <div className="trust-inner">
              <div className="trust-item">
                <strong>{stats.liveJobs.toLocaleString()}</strong>
                <span>Live opportunities</span>
              </div>
              <div className="trust-item">
                <strong>{stats.employers.toLocaleString()}</strong>
                <span>Employers & institutions represented</span>
              </div>
              <div className="trust-item">
                <strong>{stats.sources.toLocaleString()}</strong>
                <span>Active verified sources</span>
              </div>
            </div>
          </section>

          <section className="section" aria-labelledby="category-title">
            <div className="section-head">
              <div>
                <div className="section-kicker">Explore opportunities</div>
                <h2 className="section-title" id="category-title">Browse by category</h2>
              </div>
              <p>
                Use the same controlled categories across Daraja so browsing,
                filtering and alerts stay consistent.
              </p>
            </div>

            <div className="category-grid">
              {JOB_CATEGORIES.map((category) => (
                <Link
                  key={category}
                  href={"/jobs?category=" + encodeURIComponent(category)}
                  className={`category-card ${FEATURED_CATEGORIES.has(category) ? "featured" : ""}`}
                >
                  <strong>{category}</strong>
                  <span>Explore jobs <b>→</b></span>
                </Link>
              ))}
            </div>
          </section>

          <section className="how">
            <div className="section">
              <div className="section-head">
                <div>
                  <div className="section-kicker">Simple by design</div>
                  <h2 className="section-title">From search to application</h2>
                </div>
                <p>
                  Daraja keeps the path clear: discover a role, understand it,
                  then continue to the correct application destination.
                </p>
              </div>

              <div className="how-grid">
                <div className="how-card">
                  <div className="how-num">01</div>
                  <h3>Search what matters</h3>
                  <p>Start with a role, company or category and narrow the results without unnecessary steps.</p>
                </div>
                <div className="how-card">
                  <div className="how-num">02</div>
                  <h3>Review the opportunity</h3>
                  <p>See the employer, location, type, deadline and original source before deciding to continue.</p>
                </div>
                <div className="how-card">
                  <div className="how-num">03</div>
                  <h3>Apply with confidence</h3>
                  <p>Use the application route attached to the vacancy instead of searching for it again elsewhere.</p>
                </div>
              </div>
            </div>
          </section>

          <JobAlerts />

          {employerEnabled && (
            <section className="employer-strip">
              <div className="employer-card">
                <div>
                  <h2>Hiring in Tanzania?</h2>
                  <p>Publish an opportunity through the Daraja employer workspace.</p>
                </div>
                <Link href="/post-job">Post a job</Link>
              </div>
            </section>
          )}
        </main>

        <SiteFooter />
      </div>
    </>
  );
}
