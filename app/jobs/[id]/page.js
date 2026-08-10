import JobDetailPageClient from "./JobDetailPageClient";
import { employerPortalEnabled } from "@/lib/features";

export default function JobDetailPage() {
  return <JobDetailPageClient showEmployerCta={employerPortalEnabled()} />;
}
