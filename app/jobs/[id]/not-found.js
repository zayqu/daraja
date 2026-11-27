import PublicSiteNav from "@/components/PublicSiteNav";
import SiteFooter from "@/components/SiteFooter";
import NotFoundState from "@/components/ui/NotFoundState";
import { getServerT } from "@/lib/i18n-server";

export const metadata = {
  title: "Job not found",
  robots: { index: false, follow: true },
};

// A job link that no longer works (Figma Desktop · Page not found).
export default async function JobNotFound() {
  const { t } = await getServerT();
  return (
    <>
      <PublicSiteNav />
      <NotFoundState
        as="main"
        title={t("Page not found")}
        text={t("This job may have closed or the link is wrong.")}
        actionLabel={t("Go to jobs")}
      />
      <SiteFooter />
    </>
  );
}
