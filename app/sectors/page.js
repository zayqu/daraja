import Link from "next/link";
import ContentPage from "@/components/ContentPage";
import { SECTOR_GUIDES } from "@/lib/sector-guides";

export const metadata = {
  title: "Jobs in Tanzania by Sector",
  description:
    "Explore government, NGO, banking, health, education, technology and other job sectors in Tanzania, with advice on what employers look for.",
  alternates: { canonical: "/sectors" },
};

export default function SectorsPage() {
  return (
    <ContentPage
      title="Jobs by Sector"
      description="What employers in each field look for, with links to current vacancies on Daraja."
    >
      <h2>Choose a sector</h2>
      <ul>
        {SECTOR_GUIDES.map((sector) => (
          <li key={sector.slug}>
            <Link href={`/sectors/${sector.slug}`}>{sector.category} jobs</Link>
          </li>
        ))}
      </ul>

      <h2>New to job searching?</h2>
      <p>
        Start with our <Link href="/career-guides">career guides</Link> on CVs,
        application letters, interviews and the Ajira Portal.
      </p>
    </ContentPage>
  );
}
