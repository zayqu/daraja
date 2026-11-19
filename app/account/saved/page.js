import { permanentRedirect } from "next/navigation";

// Saved jobs now live on My jobs (D-038); old links keep working.
export default function SavedJobsPage() {
  permanentRedirect("/account/jobs?tab=saved");
}
