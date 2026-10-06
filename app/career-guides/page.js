import Link from "next/link";
import ContentPage from "@/components/ContentPage";
import { CAREER_GUIDES } from "@/lib/career-guides";

export const metadata = {
  title: "Career Guides for Job Seekers in Tanzania",
  description:
    "Practical Daraja guides on CVs, application letters, interviews, the Ajira Portal and avoiding job scams in Tanzania.",
  alternates: { canonical: "/career-guides" },
};

export default function CareerGuidesPage() {
  return (
    <ContentPage
      title="Career Guides"
      description="Practical advice for finding and applying for jobs in Tanzania, in English with a Swahili summary."
    >
      <h2>Guides for every step of your job search</h2>
      <p>
        These guides are written by the Daraja team to help you apply with
        confidence: from preparing documents and writing a CV to interviews and
        staying safe from recruitment fraud.
      </p>
      <ul>
        {CAREER_GUIDES.map((guide) => (
          <li key={guide.slug}>
            <Link href={`/career-guides/${guide.slug}`}>{guide.title}</Link>
            <br />
            {guide.description}
          </li>
        ))}
      </ul>

      <h2>Explore jobs by sector</h2>
      <p>
        Each <Link href="/sectors">job sector page</Link> explains what employers
        in that field look for and links to current vacancies.
      </p>
    </ContentPage>
  );
}
