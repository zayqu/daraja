import Link from "next/link";
import ContentPage from "@/components/ContentPage";

export const metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <ContentPage
      title="We couldn't find that page"
      description="The link may be old or mistyped. Here are the best places to continue."
    >
      <h2>Where to go next</h2>
      <ul>
        <li>
          <Link href="/jobs">Browse current jobs in Tanzania</Link>
        </li>
        <li>
          <Link href="/sectors">Explore jobs by sector</Link>
        </li>
        <li>
          <Link href="/career-guides">Read career guides</Link>
        </li>
        <li>
          <Link href="/contact">Report a broken link</Link>
        </li>
      </ul>
    </ContentPage>
  );
}
