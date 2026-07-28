import ContentPage from "@/components/ContentPage";

export const metadata = {
  title: "About Daraja Jobs",
  description:
    "Learn how Daraja helps candidates discover current vacancies in Tanzania.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <ContentPage
      title="About Daraja Jobs"
      description="A simpler way to discover and apply for opportunities in Tanzania."
    >
      <h2>What Daraja does</h2>
      <p>
        Daraja brings current vacancies from employers and established job
        sources into one searchable platform. Each listing identifies the
        employer, closing date when available, source and application method.
      </p>

      <h2>Built for candidates</h2>
      <p>
        Job search is free and does not require an account. Daraja aims to keep
        the journey short: discover the role, review the essential details and
        continue to the employer&apos;s application destination.
      </p>

      <h2>Independent platform</h2>
      <p>
        Daraja is an independent vacancy-discovery service. Unless a listing
        explicitly says otherwise, Daraja is not the recruiting employer and
        does not decide who is shortlisted or hired.
      </p>
    </ContentPage>
  );
}
