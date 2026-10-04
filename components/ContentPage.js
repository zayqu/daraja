import Link from "next/link";
import PublicSiteNav from "@/components/PublicSiteNav";
import SiteFooter from "@/components/SiteFooter";
import PageHero from "@/components/ui/PageHero";
import WorkspaceShell from "@/components/ui/WorkspaceShell";
import SurfaceCard from "@/components/ui/SurfaceCard";

export default function ContentPage({ title, description, children }) {
  return (
    <div className="content-page-shell">
      <PublicSiteNav />

      <PageHero
        eyebrow="Daraja"
        title={title}
        description={description}
        maxWidth="narrow"
      >
        <Link href="/" className="content-page-back">
          ← Back to Daraja
        </Link>
      </PageHero>

      <main id="main-content">
        <WorkspaceShell width="narrow" className="content-page-main">
          <SurfaceCard as="article" className="content-page-card">
            {children}
          </SurfaceCard>
        </WorkspaceShell>
      </main>

      <SiteFooter />

      <style>{`
        .content-page-shell {
          min-height: 100vh;
          background: var(--color-bg);
          color: var(--color-text);
        }

        .content-page-back {
          display: inline-flex;
          margin-top: var(--space-4);
          color: var(--color-teal);
          font-size: var(--text-caption);
          font-weight: 700;
          text-decoration: none;
        }

        .content-page-main {
          padding-top: var(--space-6);
        }

        .content-page-card {
          color: var(--color-text-secondary);
          font-size: .9rem;
          line-height: 1.75;
        }

        .content-page-card h2 {
          margin: var(--space-8) 0 0;
          color: var(--color-text);
          font-size: 1.15rem;
          line-height: 1.3;
        }

        .content-page-card h2:first-child {
          margin-top: 0;
        }

        .content-page-card h3 {
          margin: var(--space-6) 0 0;
          color: var(--color-text);
          font-size: 1rem;
          line-height: 1.4;
        }

        .content-page-card p,
        .content-page-card ul {
          margin: var(--space-3) 0 0;
        }

        .content-page-card ul {
          padding-left: var(--space-5);
        }

        .content-page-card a {
          color: var(--color-teal-deep);
          font-weight: 700;
        }

        @media (max-width: 640px) {
          .content-page-main {
            padding-top: var(--space-4);
          }

          .content-page-card {
            font-size: .86rem;
            line-height: 1.7;
          }

          .content-page-card h2 {
            margin-top: var(--space-6);
            font-size: 1.02rem;
          }
        }
      `}</style>
    </div>
  );
}
