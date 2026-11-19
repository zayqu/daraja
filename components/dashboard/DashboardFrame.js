import { auth } from "@/auth";
import DashboardShell from "@/components/dashboard/DashboardShell";
import {
  candidateCareerEnabled,
  employerPortalEnabled,
  loadSiteSettings,
} from "@/lib/features";
import prisma from "@/lib/prisma";

function initialsFor(name) {
  const parts = String(name || "D").trim().split(/\s+/).filter(Boolean);
  if (parts.length > 1) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return (parts[0] || "D").slice(0, 2).toUpperCase();
}

// The name shown in the top bar: the company for employers, the candidate's
// own name for candidates, otherwise the account name or email.
function displayName(user) {
  if (user.role === "EMPLOYER" && user.employer?.companyName) return user.employer.companyName;
  if (user.jobSeeker?.fullName) return user.jobSeeker.fullName;
  return user.name || user.email.split("@")[0];
}

// Server wrapper used by the dashboard layouts (/admin, /employer, /post-job,
// /account). Each page still checks access itself; signed-out visitors get
// the bare page, which sends them to sign in.
export default async function DashboardFrame({ children, counts = {} }) {
  await loadSiteSettings();
  const session = await auth();
  if (!session?.user?.id) return children;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      role: true,
      employer: { select: { companyName: true, verificationStatus: true } },
      jobSeeker: { select: { fullName: true } },
    },
  });
  if (!user) return children;

  const name = displayName(user);
  const candidateCareer = candidateCareerEnabled();
  const employerPortal = employerPortalEnabled();
  const isCandidateMenu = user.role !== "ADMIN" && !(user.role === "EMPLOYER" && employerPortal);

  return (
    <DashboardShell
      role={user.role}
      employerPortal={employerPortal}
      candidateCareer={candidateCareer}
      user={{ name, email: user.email, initials: initialsFor(name) }}
      counts={counts}
      notificationsHref={isCandidateMenu ? "/account/notifications" : null}
      // No paid "feature a vacancy" offer while an employer is suspended.
      showPromo={user.employer?.verificationStatus !== "SUSPENDED"}
    >
      {children}
    </DashboardShell>
  );
}
