import { findCareerGuide } from "./career-guides.js";
import { sectorGuideForCategory } from "./sector-guides.js";

// Builds Daraja's own "Before you apply" guidance for a public vacancy from
// its structured fields. It never restates or invents vacancy requirements;
// it only explains who the role type usually suits, how this application
// route works and which Daraja guides help.

function isAjiraRoute(job) {
  const url = String(job?.applicationUrl || job?.sourceUrl || "");
  return job?.source === "ajira" || /(^|\.)ajira\.go\.tz/i.test(url.replace(/^https?:\/\//, ""));
}

function isEmailRoute(job) {
  return String(job?.applicationUrl || "").startsWith("mailto:");
}

function whoItSuits(job) {
  const fit = [];
  const min = job?.experienceMinYears;
  const max = job?.experienceMaxYears;

  if (job?.type === "INTERNSHIP") {
    fit.push("Students and recent graduates looking for structured work experience.");
  } else if (Number.isInteger(min) && min === 0) {
    fit.push(
      max === 0
        ? "Candidates with little or no work experience who meet the stated qualifications."
        : "Early-career candidates who meet the stated qualifications."
    );
  } else if (Number.isInteger(min) && min > 0) {
    fit.push(`Professionals with at least ${min} year${min === 1 ? "" : "s"} of relevant experience.`);
  }

  if (job?.type === "FREELANCE") {
    fit.push("Independent professionals who can deliver work on a project basis.");
  } else if (job?.type === "CONTRACT") {
    fit.push("Candidates comfortable with a fixed-term contract.");
  } else if (job?.type === "PART_TIME") {
    fit.push("Candidates looking for part-time hours.");
  }

  if (job?.category === "Government") {
    fit.push("Applicants who meet the exact minimum qualifications; public service shortlisting is strict.");
  }

  if (!fit.length) {
    fit.push("Candidates who meet the requirements in the position description.");
  }
  return fit;
}

export function buildJobQuickGuide(job) {
  if (!job) return null;

  const steps = ["Read the full requirements and confirm you meet the minimum qualifications."];
  const guideSlugs = [];

  if (isAjiraRoute(job)) {
    steps.push("Apply through the official Ajira Portal with a complete profile and clear certificate uploads.");
    guideSlugs.push("how-to-apply-on-ajira-portal");
  } else if (isEmailRoute(job)) {
    steps.push("Email your application using the exact subject line, with your CV and documents as PDFs.");
    guideSlugs.push("applying-for-jobs-by-email");
  } else {
    steps.push("Use the Apply button to reach the employer's official application page.");
  }

  steps.push(
    job.deadline
      ? "Apply well before the deadline and confirm it on the official source."
      : "Apply early and confirm the closing date on the official source."
  );
  steps.push("Never pay anyone to apply or to be hired.");
  guideSlugs.push(job.type === "INTERNSHIP" ? "first-job-after-graduation" : "write-a-cv-employers-read");
  guideSlugs.push("avoid-job-scams");

  const links = [...new Set(guideSlugs)]
    .map(findCareerGuide)
    .filter(Boolean)
    .map((guide) => ({ href: `/career-guides/${guide.slug}`, label: guide.title }));

  const sector = sectorGuideForCategory(job.category);
  if (sector) {
    links.push({ href: `/sectors/${sector.slug}`, label: `About ${sector.category} jobs in Tanzania` });
  }

  return { fit: whoItSuits(job), steps, links };
}
