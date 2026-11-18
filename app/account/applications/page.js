import { permanentRedirect } from "next/navigation";

// Applications now live on My jobs (D-038); old links keep working.
export default function ApplicationsPage() {
  permanentRedirect("/account/jobs?tab=applied");
}
