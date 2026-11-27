import prisma from "@/lib/prisma";
import { siteSetting } from "@/lib/features";
import { normalizeCvContent, normalizeCvTheme, scoreCandidateCv } from "@/lib/cv-builder";

// Apply with Daraja CV (Figma "Apply sheet"). Only vacancies an employer
// posted on Daraja take applications here; imported jobs keep their official
// application route.
export const APPLY_JOB_SELECT = {
  id: true,
  slug: true,
  title: true,
  company: true,
  category: true,
  description: true,
  location: true,
  deadline: true,
  employerId: true,
};

export async function findApplyableJob(id) {
  if (!id || typeof id !== "string") return null;
  return prisma.job.findFirst({
    where: {
      OR: [{ id }, { slug: id }],
      active: true,
      moderationStatus: "PUBLISHED",
      employerId: { not: null },
      deadline: { gte: new Date() },
    },
    select: APPLY_JOB_SELECT,
  });
}

// Charging for extras stays off until payments are connected (owner choice,
// D-043): while off, tailoring and cover letters are free.
export function candidateExtrasPricing() {
  const on = siteSetting("candidate.paidExtras") === true;
  const price = (key, fallback) => {
    const value = siteSetting(key);
    return Number.isSafeInteger(value) && value > 0 ? value : fallback;
  };
  return {
    paid: on,
    tailorPrice: on ? price("candidate.tailorPrice", 15000) : 0,
    coverLetterPrice: on ? price("candidate.coverLetterPrice", 5000) : 0,
  };
}

// One CV scored against one job: ATS readiness plus how much of the
// vacancy's language the candidate's own CV already covers.
export function scoreCvForJob(cv, job) {
  const content = normalizeCvContent(cv.content);
  const evaluation = scoreCandidateCv(content, { mode: cv.mode, job });
  return {
    id: cv.id,
    name: cv.name,
    kind: cv.kind,
    tailoredForThisJob: cv.targetJobId === job.id,
    atsScore: evaluation.score,
    matchScore: evaluation.matchScore,
    matchedKeywords: evaluation.matchedKeywords.slice(0, 6),
    missingKeywords: evaluation.missingKeywords.slice(0, 4),
    updatedAt: cv.updatedAt,
  };
}

// The best CV to send: highest job match, then ATS readiness; a copy made
// for this job wins a tie.
export function bestCvId(scored) {
  const ranked = [...scored].sort(
    (a, b) =>
      (b.matchScore ?? -1) - (a.matchScore ?? -1) ||
      b.atsScore - a.atsScore ||
      Number(b.tailoredForThisJob) - Number(a.tailoredForThisJob),
  );
  return ranked[0]?.id || null;
}

export function cvSnapshot(cv) {
  return {
    name: cv.name,
    mode: cv.mode,
    language: cv.language,
    content: normalizeCvContent(cv.content),
    theme: normalizeCvTheme(cv.theme),
  };
}
