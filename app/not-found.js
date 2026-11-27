import Link from "next/link";
import PublicSiteNav from "@/components/PublicSiteNav";
import SiteFooter from "@/components/SiteFooter";
import NotFoundState from "@/components/ui/NotFoundState";
import { getServerT } from "@/lib/i18n-server";

export const metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

// Figma Desktop · Page not found.
export default async function NotFound() {
  const { t } = await getServerT();
  return (
    <>
      <PublicSiteNav />
      <NotFoundState
        as="main"
        title={t("Page not found")}
        text={t("This page may have moved or the link is wrong.")}
        actionLabel={t("Go to jobs")}
        secondary={
          <>
            <Link href="/">{t("Home")}</Link>
            <Link href="/career-guides">{t("Career guides")}</Link>
            <Link href="/contact">{t("Report a broken link")}</Link>
          </>
        }
      />
      <SiteFooter />
    </>
  );
}
