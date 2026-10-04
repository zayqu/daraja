import { candidateCareerEnabled, employerPortalEnabled } from "@/lib/features";
import SiteNav from "@/components/SiteNav";
import { buildPublicNavigation } from "@/lib/public-navigation";

export default function PublicSiteNav(props) {
  const employerEnabled = employerPortalEnabled();
  const careerEnabled = candidateCareerEnabled();
  const links = buildPublicNavigation({ employerEnabled, candidateCareerEnabled: careerEnabled });

  return (
    <SiteNav
      {...props}
      links={links}
      showCandidateProfile={candidateCareerEnabled()}
      showEmployerCta={employerPortalEnabled()}
      right={false}
    />
  );
}
