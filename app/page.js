import Link from "next/link";
import JobAlerts from "@/components/JobAlerts";
import PublicSiteNav from "@/components/PublicSiteNav";
import { employerPortalEnabled } from "@/lib/features";
import { JOB_CATEGORIES } from "@/lib/job-categories";
import SiteFooter from "@/components/SiteFooter";
import HomeHeroBridge from "@/components/HomeHeroBridge";

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

export default function Home() {
  const employerEnabled = employerPortalEnabled();

  return (
    <>
      <style>{`
        .home { background: #f7f8fa; min-height: 100vh; color: #1b2a3f; }

        .hero {
          position: relative;
          overflow: hidden;
          padding: 5.25rem var(--gutter) 5.5rem;
          background: #fbfaf7;
          border-bottom: 1px solid #ebe8e1;
        }

        .hero-inner {
          max-width: 1080px;
          margin: 0 auto;
          position: relative;
          z-index: 1;
        }

        .hero-layout {
          display: grid;
          grid-template-columns: minmax(0, 720px) minmax(260px, 1fr);
          align-items: center;
          gap: 2rem;
          margin-bottom: 2rem;
        }

        .hero-copy {
          max-width: 720px;
        }

        .hero-eyebrow,
        .section-kicker {
          color: #00c9a7;
          font-size: .7rem;
          font-weight: 700;
          letter-spacing: .16em;
          text-transform: uppercase;
        }

        .hero h1 {
          max-width: 760px;
          margin: .8rem 0 1rem;
          color: #1b1f23;
          font-size: clamp(2.4rem, 6vw, 4.5rem);
          line-height: .98;
          letter-spacing: -.045em;
        }

        .hero h1 .hero-word {
          display: inline-block;
          animation: hero-word-rise .7s cubic-bezier(.22, 1, .36, 1) backwards;
        }

        .hero h1 .hero-accent { color: #00c9a7; }

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
          background: #00c9a7;
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

        @media (prefers-reduced-motion: reduce) {
          .hero *,
          .hero *::before,
          .hero *::after {
            animation: none !important;
          }
        }

        .hero-lead {
          max-width: 620px;
          color: #667085;
          font-size: 1rem;
          line-height: 1.7;
        }

        .hero-search {
          display: grid;
          grid-template-columns: minmax(0, 1.7fr) minmax(220px, .8fr) auto;
          gap: .65rem;
          max-width: 940px;
          padding: .7rem;
          border-radius: 18px;
          background: #fff;
          border: 1px solid #e4e1da;
          box-shadow: 0 18px 45px rgba(27, 31, 35, .08);
        }

        .hero-field {
          min-height: 54px;
          width: 100%;
          border: 1px solid #e5e9ef;
          border-radius: 12px;
          background: #fff;
          color: #1b2a3f;
          padding: 0 1rem;
          outline: none;
        }

        .hero-field:focus {
          border-color: #00c9a7;
          box-shadow: 0 0 0 3px rgba(0,201,167,.08);
        }

        .hero-submit {
          min-height: 54px;
          padding: 0 1.6rem;
          border: 0;
          border-radius: 12px;
          background: #00c9a7;
          color: #1b2a3f;
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

        .quick-links a:hover { color: #00c9a7; }

        .trust {
          background: #fff;
          border-bottom: 1px solid #e8ecf0;
        }

        .trust-inner {
          max-width: 1080px;
          margin: 0 auto;
          padding: 1.35rem var(--gutter);
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1rem;
        }

        .trust-item {
          padding-right: 1rem;
          border-right: 1px solid #eef1f4;
        }

        .trust-item:last-child { border-right: 0; }

        .trust-item strong {
          display: block;
          margin-bottom: .15rem;
          color: #1b2a3f;
          font-size: .84rem;
        }

        .trust-item span {
          color: #8b95a1;
          font-size: .72rem;
        }

        .section {
          max-width: 1080px;
          margin: 0 auto;
          padding: 4.25rem var(--gutter);
        }

        .section-head {
          display: flex;
          align-items: end;
          justify-content: space-between;
          gap: 1.5rem;
          margin-bottom: 1.8rem;
        }

        .section-title {
          margin-top: .45rem;
          color: #1b2a3f;
          font-size: clamp(1.65rem, 3vw, 2.15rem);
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
          gap: .85rem;
        }

        .category-card {
          min-height: 138px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 1.25rem;
          border: 1px solid #e3e8ee;
          border-radius: 16px;
          background: #fff;
          text-decoration: none;
          transition: transform .15s ease, border-color .15s ease, box-shadow .15s ease;
        }

        .category-card:hover {
          transform: translateY(-2px);
          border-color: #00c9a7;
          box-shadow: var(--shadow-card);
        }

        .category-card.featured {
          border-color: rgba(0,201,167,.38);
          background: #f4fffc;
        }

        .category-card strong {
          color: #1b2a3f;
          font-size: .9rem;
          line-height: 1.35;
        }

        .category-card span {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: .75rem;
          color: #8b95a1;
          font-size: .7rem;
        }

        .category-card span b {
          color: #087f6c;
          font-size: 1rem;
          font-weight: 500;
        }

        .how {
          background: #fff;
          border-top: 1px solid #e8ecf0;
          border-bottom: 1px solid #e8ecf0;
        }

        .how-grid {
          margin-top: 2rem;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
        }

        .how-card {
          padding: 1.6rem;
          border: 1px solid #e8ecf0;
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
          background: #1b2a3f;
          color: #00c9a7;
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
          max-width: 1080px;
          margin: 0 auto 4.25rem;
          padding: 0 var(--gutter);
        }

        .employer-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 2rem;
          padding: 2rem;
          border-radius: 18px;
          background: #1b2a3f;
        }

        .employer-card h2 {
          color: #fff;
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
          background: #00c9a7;
          color: #1b2a3f;
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
            padding: 2.5rem var(--gutter) 2.6rem;
            background: #fbfaf7;
          }

          .hero-layout {
            margin-bottom: 1.15rem;
          }

          .hero-copy {
            max-width: none;
          }

          .hero-eyebrow,
          .section-kicker {
            font-size: .62rem;
          }

          .hero h1 {
            max-width: 340px;
            margin-top: .55rem;
            font-size: 2.25rem;
            line-height: 1.01;
          }

          .hero-lead {
            max-width: 360px;
            font-size: .84rem;
            line-height: 1.55;
          }

          .hero-search {
            grid-template-columns: 1fr;
            gap: .45rem;
            padding: .45rem;
            border-radius: 14px;
            box-shadow: none;
          }

          .hero-field,
          .hero-submit {
            min-height: 46px;
            border-radius: 10px;
          }

          .hero-submit {
            grid-column: auto;
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
            grid-template-columns: repeat(2, 1fr);
            gap: 0;
            padding-top: .9rem;
            padding-bottom: .9rem;
          }

          .trust-item {
            min-height: 66px;
            padding: .75rem .7rem;
            border-right: 1px solid #eef1f4;
            border-bottom: 1px solid #eef1f4;
          }

          .trust-item:nth-child(2),
          .trust-item:nth-child(4) {
            border-right: 0;
          }

          .trust-item:nth-child(3),
          .trust-item:nth-child(4) {
            border-bottom: 0;
          }

          .trust-item strong {
            font-size: .76rem;
          }

          .trust-item span {
            font-size: .66rem;
            line-height: 1.45;
          }

          .section {
            padding-top: 2.35rem;
            padding-bottom: 2.35rem;
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

          <section className="trust" aria-label="Daraja service highlights">
            <div className="trust-inner">
              <div className="trust-item"><strong>Current opportunities</strong><span>Expired roles are separated clearly.</span></div>
              <div className="trust-item"><strong>Free to browse</strong><span>No account needed to search vacancies.</span></div>
              <div className="trust-item"><strong>Checked hourly</strong><span>Enabled job sources are refreshed regularly.</span></div>
              <div className="trust-item"><strong>Source shown</strong><span>Every listing keeps its application destination.</span></div>
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
