import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { candidateCareerEnabled, getCandidateUser } from "@/lib/candidate-access";
import { readProtectedJson, protectMutation } from "@/lib/request-security";
import {
  normalizeCvContent,
  normalizeCvTheme,
  scoreCandidateCv,
} from "@/lib/cv-builder";

const privateHeaders = { "Cache-Control": "private, no-store, max-age=0" };

const privateJson = (payload, init = {}) =>
  NextResponse.json(payload, {
    ...init,
    headers: { ...privateHeaders, ...(init.headers || {}) },
  });

const clean = (value, max = 160) =>
  typeof value === "string"
    ? value.replace(/\s+/g, " ").trim().slice(0, max)
    : "";

async function actorCv(id) {
  if (!candidateCareerEnabled()) {
    return { error: privateJson({ error: "Not found" }, { status: 404 }) };
  }
  const user = await getCandidateUser();
  if (!user) {
    return { error: privateJson({ error: "Sign in required" }, { status: 401 }) };
  }
  if (!user.jobSeeker) {
    return { error: privateJson({ error: "CV not found" }, { status: 404 }) };
  }

  const cv = await prisma.candidateCv.findFirst({
    where: { id, jobSeekerId: user.jobSeeker.id },
  });
  return cv
    ? { user, cv }
    : { error: privateJson({ error: "CV not found" }, { status: 404 }) };
}

async function jobFor(id) {
  if (!id) return null;
  return prisma.job.findFirst({
    where: { id, active: true, moderationStatus: "PUBLISHED" },
    select: {
      id: true,
      slug: true,
      title: true,
      company: true,
      category: true,
      description: true,
      location: true,
      deadline: true,
    },
  });
}

export async function GET(_request, context) {
  const { id } = await context.params;
  const { cv, error } = await actorCv(id);
  if (error) return error;

  const job = await jobFor(cv.targetJobId);
  const evaluation = scoreCandidateCv(normalizeCvContent(cv.content), {
    mode: cv.mode,
    job,
  });

  return privateJson({ cv, job, evaluation });
}

export async function PUT(request, context) {
  const { id } = await context.params;
  const { user, cv, error } = await actorCv(id);
  if (error) return error;

  const parsed = await readProtectedJson(request, {
    scope: "candidate-cv-update",
    limit: 60,
    maxBytes: 96_000,
    rateIdentity: user.id,
  });
  if (parsed.error) return parsed.error;

  const targetJobId =
    Object.prototype.hasOwnProperty.call(parsed.body, "targetJobId")
      ? clean(parsed.body.targetJobId, 80) || null
      : cv.targetJobId;
  const job = await jobFor(targetJobId);
  if (targetJobId && !job) {
    return privateJson({ error: "Selected vacancy is not available." }, { status: 404 });
  }

  const content = normalizeCvContent(
    Object.prototype.hasOwnProperty.call(parsed.body, "content")
      ? parsed.body.content
      : cv.content
  );
  const theme = normalizeCvTheme(
    Object.prototype.hasOwnProperty.call(parsed.body, "theme")
      ? parsed.body.theme
      : cv.theme
  );
  const mode = parsed.body.mode === "PUBLIC_SERVICE"
    ? "PUBLIC_SERVICE"
    : parsed.body.mode === "GENERAL"
      ? "GENERAL"
      : cv.mode;
  const evaluation = scoreCandidateCv(content, { mode, job });

  const updated = await prisma.candidateCv.update({
    where: { id: cv.id },
    data: {
      name: clean(parsed.body.name, 120) || cv.name,
      mode,
      targetRole: Object.prototype.hasOwnProperty.call(parsed.body, "targetRole")
        ? clean(parsed.body.targetRole, 180) || null
        : cv.targetRole,
      targetJobId,
      language: parsed.body.language === "sw"
        ? "sw"
        : parsed.body.language === "en"
          ? "en"
          : cv.language,
      content,
      theme,
      atsScore: evaluation.score,
    },
  });

  return privateJson({ cv: updated, job, evaluation });
}

export async function DELETE(request, context) {
  const { id } = await context.params;
  const { user, cv, error } = await actorCv(id);
  if (error) return error;

  const mutationError = protectMutation(request, {
    scope: "candidate-cv-delete",
    limit: 20,
    rateIdentity: user.id,
  });
  if (mutationError) return mutationError;

  await prisma.candidateCv.delete({ where: { id: cv.id } });
  return privateJson({ deleted: true });
}
