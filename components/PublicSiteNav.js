import { candidateCareerEnabled, employerPortalEnabled } from "@/lib/features";
import SiteNav from "@/components/SiteNav";

export default function PublicSiteNav(props) {
  const employerEnabled = employerPortalEnabled();
  const links = [
    { href: "/", label: "Home" },
    { href: "/jobs", label: "Jobs" },
    { href: "/jobs?type=FREELANCE", label: "Freelance" },
    ...(employerEnabled ? [{ href: "/employer", label: "Employers" }] : []),
    { href: "/about", label: "About" },
  ];

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
