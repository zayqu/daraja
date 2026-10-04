import JobsPageClient from "./JobsPageClient";
import { candidateCareerEnabled, employerPortalEnabled } from "@/lib/features";
import { normalizeJobsSearchParams } from "@/lib/job-search";
import {
  PUBLIC_JOBS_PAGE_SIZE,
  readPublicJobs,
} from "@/lib/public-jobs";

export default async function JobsPage({ searchParams }) {
  const filters = normalizeJobsSearchParams(await searchParams);

  let initialJobs = [];
  let initialPagination = {
    total: 0,
    page: filters.page,
    limit: PUBLIC_JOBS_PAGE_SIZE,
    pages: 0,
  };
  let initialError = "";

  try {
    const result = await readPublicJobs({
      ...filters,
      limit: PUBLIC_JOBS_PAGE_SIZE,
    });
    initialJobs = result.jobs;
    initialPagination = result.pagination;
  } catch (error) {
    console.error("Jobs page initial read failed:", error);
    initialError = "We could not load the jobs. Please try again.";
  }

  return (
    <JobsPageClient
      showEmployerCta={employerPortalEnabled()}
      showCandidateCv={candidateCareerEnabled()}
      initialJobs={initialJobs}
      initialPagination={initialPagination}
      initialFilters={filters}
      initialError={initialError}
    />
  );
}
