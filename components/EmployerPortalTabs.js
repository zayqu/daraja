import WorkspaceTabs from "@/components/ui/WorkspaceTabs";

export default function EmployerPortalTabs({ showAdmin = false }) {
  const links = [
    { href: "/employer", label: "Employer workspace" },
    { href: "/post-job", label: "Create vacancy" },
    ...(showAdmin ? [{ href: "/admin", label: "Moderation" }] : []),
  ];

  return <WorkspaceTabs links={links} label="Employer workspace" />;
}
