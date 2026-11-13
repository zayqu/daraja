import WorkspaceTabs from "@/components/ui/WorkspaceTabs";

// "Create vacancy" only shows when the account can actually create one
// (an employer profile that is not suspended, or an administrator).
export default function EmployerPortalTabs({ showAdmin = false, showCreateVacancy = true }) {
  const links = [
    { href: "/employer", label: "Employer workspace" },
    ...(showCreateVacancy ? [{ href: "/post-job", label: "Create vacancy" }] : []),
    ...(showAdmin ? [{ href: "/admin", label: "Moderation" }] : []),
  ];

  return <WorkspaceTabs links={links} label="Employer workspace" />;
}
