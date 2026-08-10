import { employerPortalEnabled } from "@/lib/features";
import SiteNav from "@/components/SiteNav";

export default function PublicSiteNav(props) {
  return (
    <SiteNav
      {...props}
      showEmployerCta={employerPortalEnabled()}
    />
  );
}
