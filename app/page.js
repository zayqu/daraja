import Link from "next/link";
import JobAlerts from "@/components/JobAlerts";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";

export default function Home() {
  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .home { font-family: inherit; background: #F7F8FA; min-height: 100vh; color: #1B2A3F; }

        .hero { background: #1B2A3F; padding: 5rem 3rem 4.5rem; text-align: center; position: relative; overflow: hidden; }
        .hero::before { content: ''; position: absolute; top: -80px; left: 50%; transform: translateX(-50%); width: 600px; height: 600px; border-radius: 50%; border: 1px solid rgba(0,201,167,0.06); pointer-events: none; }
        .hero::after { content: ''; position: absolute; top: -40px; left: 50%; transform: translateX(-50%); width: 380px; height: 380px; border-radius: 50%; border: 1px solid rgba(0,201,167,0.05); pointer-events: none; }
        .hero-inner { max-width: 680px; margin: 0 auto; position: relative; }
        .hero-eyebrow { font-size: 0.68rem; font-weight: 600; letter-spacing: 0.3em; text-transform: uppercase; color: #00C9A7; margin-bottom: 1.25rem; }
        .hero-title { font-family: inherit; font-size: 2.8rem; font-weight: 700; color: #fff; line-height: 1.18; letter-spacing: -0.02em; margin-bottom: 1.25rem; }
        .hero-title span { color: #00C9A7; }
        .hero-sub { font-size: 0.92rem; font-weight: 300; color: rgba(255,255,255,0.5); line-height: 1.7; margin-bottom: 2.5rem; max-width: 480px; margin-left: auto; margin-right: auto; }
        .hero-btns { display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; }
        .btn-primary { font-family: inherit; font-size: 0.82rem; font-weight: 600; background: #00C9A7; color: #1B2A3F; padding: 0.8rem 2rem; border-radius: 4px; text-decoration: none; letter-spacing: 0.04em; transition: opacity 0.2s; }
        .btn-primary:hover { opacity: 0.88; }
        .btn-outline { font-family: inherit; font-size: 0.82rem; font-weight: 500; background: transparent; color: rgba(255,255,255,0.7); padding: 0.8rem 2rem; border-radius: 4px; text-decoration: none; letter-spacing: 0.04em; border: 1.5px solid rgba(255,255,255,0.15); transition: all 0.2s; }
        .btn-outline:hover { border-color: #00C9A7; color: #00C9A7; }

        .stats { background: #fff; border-bottom: 1px solid #E8ECF0; }
        .stats-inner { max-width: 860px; margin: 0 auto; padding: 2.5rem 3rem; display: grid; grid-template-columns: repeat(4, 1fr); }
        .stat { text-align: center; padding: 0 1rem; border-right: 1px solid #E8ECF0; }
        .stat:last-child { border-right: none; }
        .stat-num { font-family: inherit; font-size: 1.8rem; font-weight: 700; color: #00C9A7; letter-spacing: -0.02em; }
        .stat-label { font-size: 0.75rem; color: #8B95A1; margin-top: 0.25rem; font-weight: 400; }

        .section { max-width: 860px; margin: 0 auto; padding: 3.5rem 3rem; }
        .section-label { font-size: 0.68rem; font-weight: 600; letter-spacing: 0.25em; text-transform: uppercase; color: #00C9A7; margin-bottom: 0.75rem; }
        .section-title { font-family: inherit; font-size: 1.5rem; font-weight: 700; color: #1B2A3F; margin-bottom: 2rem; letter-spacing: -0.02em; }

        .cat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.75rem; }
        .cat-card { background: #fff; border: 1.5px solid #E8ECF0; border-radius: 6px; padding: 1.5rem 1.25rem; text-decoration: none; transition: all 0.15s; display: block; }
        .cat-card:hover { border-color: #00C9A7; box-shadow: 0 2px 12px rgba(0,201,167,0.08); }
        .cat-name { font-family: inherit; font-size: 0.85rem; font-weight: 600; color: #1B2A3F; margin-bottom: 0.25rem; }
        .cat-card:hover .cat-name { color: #00C9A7; }
        .cat-desc { font-size: 0.72rem; color: #8B95A1; line-height: 1.5; }

        .why { background: #1B2A3F; }
        .why-inner { max-width: 860px; margin: 0 auto; padding: 3.5rem 3rem; }
        .why-label { font-size: 0.68rem; font-weight: 600; letter-spacing: 0.25em; text-transform: uppercase; color: #00C9A7; margin-bottom: 0.75rem; }
        .why-title { font-family: inherit; font-size: 1.5rem; font-weight: 700; color: #fff; margin-bottom: 2rem; letter-spacing: -0.02em; }
        .why-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; }
        .why-card { border: 1px solid rgba(255,255,255,0.07); border-radius: 6px; padding: 1.5rem; }
        .why-icon { font-size: 1.2rem; margin-bottom: 0.85rem; color: #00C9A7; font-weight: 700; }
        .why-heading { font-family: inherit; font-size: 0.88rem; font-weight: 600; color: #fff; margin-bottom: 0.4rem; }
        .why-text { font-size: 0.78rem; color: rgba(255,255,255,0.4); line-height: 1.65; font-weight: 300; }

        .cta-strip { background: #00C9A7; padding: 3rem; text-align: center; }
        .cta-strip h2 { font-family: inherit; font-size: 1.4rem; font-weight: 700; color: #1B2A3F; margin-bottom: 0.5rem; }
        .cta-strip p { font-size: 0.85rem; color: rgba(27,42,63,0.7); margin-bottom: 1.5rem; }
        .btn-dark { font-family: inherit; font-size: 0.82rem; font-weight: 600; background: #1B2A3F; color: #fff; padding: 0.8rem 2rem; border-radius: 4px; text-decoration: none; letter-spacing: 0.04em; transition: opacity 0.2s; display: inline-block; }
        .btn-dark:hover { opacity: 0.88; }

        @media (max-width: 1024px) and (min-width: 641px) {
          .cat-grid { grid-template-columns: repeat(3, 1fr); }
        }

        @media (max-width: 640px) {
          .hero { padding: 3.5rem 1.25rem 3rem; }
          .hero-title { font-size: 1.9rem; }
          .stats-inner { grid-template-columns: repeat(2, 1fr); gap: 1.5rem; padding: 2rem 1.25rem; }
          .stat { border-right: none; }
          .section { padding: 2.5rem 1.25rem; }
          .cat-grid { grid-template-columns: repeat(2, 1fr); }
          .why-inner { padding: 2.5rem 1.25rem; }
          .why-grid { grid-template-columns: 1fr; gap: 1rem; }
          .cta-strip { padding: 2.5rem 1.25rem; }
        }
      `}</style>

      <div className="home">

        <SiteNav />

        <main className="hero" id="main-content">
          <div className="hero-inner">
          <div className="hero-eyebrow">Tanzania&apos;s Professional Job Platform</div>
            <h1 className="hero-title">
              Kazi Na Fursa<br />
              <span>Tanzania</span>
            </h1>
            <p className="hero-sub">
              Connecting job seekers, employers and freelancers across Tanzania.
              Government, NGO, private sector and more — all in one place.
            </p>
            <div className="hero-btns">
              <Link href="/jobs" className="btn-primary">Browse All Jobs</Link>
              <Link href="/post-job" className="btn-outline">Post a Job</Link>
            </div>
          </div>
        </main>

        <div className="stats">
          <div className="stats-inner">
            <div className="stat">
              <div className="stat-num">Current</div>
              <div className="stat-label">Open Positions</div>
            </div>
            <div className="stat">
              <div className="stat-num">Free</div>
              <div className="stat-label">To Browse</div>
            </div>
            <div className="stat">
              <div className="stat-num">Hourly</div>
              <div className="stat-label">Source Checks</div>
            </div>
            <div className="stat">
              <div className="stat-num">Clear</div>
              <div className="stat-label">Source Details</div>
            </div>
          </div>
        </div>

        <div className="section">
          <div className="section-label">Explore</div>
          <div className="section-title">Browse by Category</div>
          <div className="cat-grid">
            {[
              { name: "Government", desc: "Public sector & civil service roles" },
              { name: "NGO & Development", desc: "UN, USAID, World Bank & nonprofits" },
              { name: "Education", desc: "Universities, schools & training" },
              { name: "Health", desc: "Hospitals, clinics & public health" },
              { name: "Banking & Finance", desc: "Banking, insurance & accounting" },
              { name: "Technology", desc: "Software, systems & tech roles" },
              { name: "Engineering", desc: "Civil, mechanical & electrical" },
              { name: "General", desc: "All other industries" },
            ].map((cat) => (
              <Link
                key={cat.name}
                href={"/jobs?category=" + encodeURIComponent(cat.name)}
                className="cat-card"
              >
                <div className="cat-name">{cat.name}</div>
                <div className="cat-desc">{cat.desc}</div>
              </Link>
            ))}
          </div>
        </div>

        <div className="why">
          <div className="why-inner">
            <div className="why-label">Why Daraja</div>
            <div className="why-title">Built for Tanzania</div>
            <div className="why-grid">
              <div className="why-card">
                <div className="why-icon">✓</div>
                <div className="why-heading">Trusted Sources</div>
                <div className="why-text">
                  Every listing clearly identifies its employer and original application source.
                </div>
              </div>
              <div className="why-card">
                <div className="why-icon">✓</div>
                <div className="why-heading">Easy Job Search</div>
                <div className="why-text">
                  Search by role or company and filter opportunities by category and status.
                </div>
              </div>
              <div className="why-card">
                <div className="why-icon">✓</div>
                <div className="why-heading">Swahili & English</div>
                <div className="why-text">
                  Full support for both languages. Daraja is built for all Tanzanians.
                </div>
              </div>
            </div>
          </div>
        </div>

        <JobAlerts />

        <div className="cta-strip">
          <h2>Are you hiring?</h2>
          <p>Post your job on Daraja and reach thousands of qualified candidates across Tanzania.</p>
          <Link href="/post-job" className="btn-dark">Post a Job Today</Link>
        </div>

        <SiteFooter />

      </div>
    </>
  );
}
