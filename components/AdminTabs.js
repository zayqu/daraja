import WorkspaceTabs from "@/components/ui/WorkspaceTabs";

export default function AdminTabs() {
  const links = [
    { href: "/admin/jobs", label: "Vacancies" },
    { href: "/admin/jobs/new", label: "Post a vacancy" },
    { href: "/admin", label: "Review queue" },
  ];

  return <WorkspaceTabs links={links} label="Administration" />;
}
