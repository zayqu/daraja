import Link from "next/link";
import { notFound } from "next/navigation";
import ContentPage from "@/components/ContentPage";
import { findCareerGuide } from "@/lib/career-guides";
import { SECTOR_GUIDES, findSectorGuide } from "@/lib/sector-guides";

export function generateStaticParams() {
  return SECTOR_GUIDES.map((sector) => ({ slug: sector.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const sector = findSectorGuide(slug);
  if (!sector) return {};

  const title = `${sector.category} Jobs in Tanzania`;
  return {
    title,
    description: sector.intro[0],
    alternates: { canonical: `/sectors/${sector.slug}` },
  };
}

export default async function SectorPage({ params }) {
  const { slug } = await params;
  const sector = findSectorGuide(slug);
  if (!sector) notFound();

  const jobsHref = `/jobs?category=${encodeURIComponent(sector.category)}`;
  const guides = sector.guides.map(findCareerGuide).filter(Boolean);

  return (
    <ContentPage
      title={`${sector.category} Jobs in Tanzania`}
      description={`An introduction to ${sector.category.toLowerCase()} careers and current vacancies on Daraja.`}
    >
      <h2>About this sector</h2>
      {sector.intro.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}

      <h2>Tips for applicants</h2>
      <ul>
        {sector.tips.map((tip) => (
          <li key={tip}>{tip}</li>
        ))}
      </ul>

      <h2>Current vacancies</h2>
      <p>
        <Link href={jobsHref}>Browse current {sector.category} jobs →</Link>
      </p>

      {guides.length > 0 && (
        <>
          <h2>Helpful guides</h2>
          <ul>
            {guides.map((guide) => (
              <li key={guide.slug}>
                <Link href={`/career-guides/${guide.slug}`}>{guide.title}</Link>
              </li>
            ))}
          </ul>
        </>
      )}

      <p>
        <Link href="/sectors">← All sectors</Link>
      </p>
    </ContentPage>
  );
}
