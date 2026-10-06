import Link from "next/link";
import { notFound } from "next/navigation";
import ContentPage from "@/components/ContentPage";
import {
  CAREER_GUIDES,
  CAREER_GUIDES_UPDATED,
  findCareerGuide,
} from "@/lib/career-guides";

export function generateStaticParams() {
  return CAREER_GUIDES.map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const guide = findCareerGuide(slug);
  if (!guide) return {};

  return {
    title: guide.title,
    description: guide.description,
    alternates: { canonical: `/career-guides/${guide.slug}` },
    openGraph: {
      type: "article",
      title: guide.title,
      description: guide.description,
      url: `/career-guides/${guide.slug}`,
    },
  };
}

export default async function CareerGuidePage({ params }) {
  const { slug } = await params;
  const guide = findCareerGuide(slug);
  if (!guide) notFound();

  const related = CAREER_GUIDES.filter((item) => item.slug !== guide.slug).slice(0, 3);

  return (
    <ContentPage title={guide.title} description={guide.description}>
      {guide.sections.map((section) => (
        <section key={section.heading}>
          <h2>{section.heading}</h2>
          {(section.paragraphs || []).map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          {section.items?.length > 0 && (
            <ul>
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
        </section>
      ))}

      <h2>Find your next opportunity</h2>
      <p>
        <Link href="/jobs">Browse current jobs in Tanzania</Link> or explore{" "}
        <Link href="/sectors">jobs by sector</Link>.
      </p>

      <h3>More career guides</h3>
      <ul>
        {related.map((item) => (
          <li key={item.slug}>
            <Link href={`/career-guides/${item.slug}`}>{item.title}</Link>
          </li>
        ))}
      </ul>

      <p>
        <small>Daraja editorial team · Last reviewed {CAREER_GUIDES_UPDATED}</small>
      </p>
    </ContentPage>
  );
}
