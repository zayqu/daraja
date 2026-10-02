import WorkspaceTabs from "@/components/ui/WorkspaceTabs";

export default function CandidateAccountTabs({ showCareer = false }) {
  const links = [
    ...(showCareer ? [{ href: "/account/career", label: "Career workspace" }] : []),
    { href: "/account/alerts", label: "Job alerts" },
    { href: "/account/privacy", label: "Privacy & data" },
  ];

  return <WorkspaceTabs links={links} label="Candidate account" />;
}
