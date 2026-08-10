import JobsPageClient from "./JobsPageClient";
import { employerPortalEnabled } from "@/lib/features";

export default function JobsPage() {
  return <JobsPageClient showEmployerCta={employerPortalEnabled()} />;
}
