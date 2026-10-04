import WorkspaceTabs from "@/components/ui/WorkspaceTabs";

export default function CandidateAccountTabs({ showCareer = false }) {
  const links = [
    ...(showCareer
      ? [
          { href: "/account/profile", label: "Profile" },
          { href: "/account/career", label: "Career workspace" },
          { href: "/account/career/cv", label: "CV Builder" },
        ]
      : []),
    { href: "/account/notifications", label: "Notifications" },
    { href: "/account/alerts", label: "Job alerts" },
    { href: "/account/privacy", label: "Privacy & data" },
  ];

  return <WorkspaceTabs links={links} label="Candidate account" />;
}
