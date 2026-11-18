import { permanentRedirect } from "next/navigation";

// The career workspace became the candidate dashboard at /account (D-038).
// This address stays so old links and bookmarks keep working.
export default function CareerWorkspaceRedirect() {
  permanentRedirect("/account");
}
