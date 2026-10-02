import Link from "next/link";
import PublicSiteNav from "@/components/PublicSiteNav";
import SiteFooter from "@/components/SiteFooter";

export default function ContentPage({ title, description, children }) {
  return (
    <div className="content-page-shell">
      <PublicSiteNav />

      <header className="content-page-hero">
        <div className="content-page-hero-inner">
          <Link href="/" className="content-page-back">
            ← Daraja
          </Link>
          <h1>{title}</h1>
          {description && <p>{description}</p>}
        </div>
      </header>

      <main id="main-content" className="content-page-main">
        <article className="content-page-card">
          {children}
        </article>
      </main>

      <SiteFooter />

      <style>{`
        .content-page-shell {
          min-height: 100vh;
          background: var(--color-bg);
          color: var(--color-text);
        }

        .content-page-hero {
          background: var(--color-navy);
          padding: 2.35rem var(--gutter) 2.6rem;
        }

        .content-page-hero-inner {
          max-width: 760px;
          margin: 0 auto;
        }

        .content-page-back {
          display: inline-flex;
          margin-bottom: 1rem;
          color: var(--color-teal);
          font-size: .72rem;
          font-weight: 750;
          text-decoration: none;
        }

        .content-page-hero h1 {
          margin: 0;
          color: #fff;
          font-size: clamp(2rem, 5vw, 3rem);
          line-height: 1.08;
          letter-spacing: -.035em;
        }

        .content-page-hero p {
          max-width: 620px;
          margin: .75rem 0 0;
          color: rgba(255,255,255,.6);
          font-size: .9rem;
          line-height: 1.65;
        }

        .content-page-main {
          max-width: 840px;
          margin: 0 auto;
          padding: 1.5rem var(--gutter) 4rem;
        }

        .content-page-card {
          padding: 1.6rem;
          border: 1px solid var(--color-border-strong);
          border-radius: var(--radius-card);
          background: #fff;
          box-shadow: 0 1px 0 rgba(16,24,40,.02);
          color: var(--color-text-secondary);
          font-size: .9rem;
          line-height: 1.75;
        }

        .content-page-card h2 {
          margin: 2rem 0 0;
          color: var(--color-text);
          font-size: 1.15rem;
          line-height: 1.3;
        }

        .content-page-card h2:first-child {
          margin-top: 0;
        }

        .content-page-card h3 {
          margin: 1.5rem 0 0;
          color: var(--color-text);
          font-size: 1rem;
          line-height: 1.4;
        }

        .content-page-card p,
        .content-page-card ul {
          margin: .75rem 0 0;
        }

        .content-page-card ul {
          padding-left: 1.25rem;
        }

        .content-page-card a {
          color: var(--color-teal-deep);
          font-weight: 700;
        }

        @media (max-width: 640px) {
          .content-page-hero {
            padding-top: 1.6rem;
            padding-bottom: 1.8rem;
          }

          .content-page-hero h1 {
            font-size: 1.9rem;
          }

          .content-page-hero p {
            font-size: .82rem;
          }

          .content-page-main {
            padding-top: 1rem;
            padding-bottom: 3rem;
          }

          .content-page-card {
            padding: 1.15rem;
            border-radius: 14px;
            font-size: .86rem;
            line-height: 1.7;
          }

          .content-page-card h2 {
            margin-top: 1.6rem;
            font-size: 1.02rem;
          }
        }
      `}</style>
    </div>
  );
}
