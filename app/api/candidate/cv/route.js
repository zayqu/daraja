import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  candidateCareerEnabled,
  ensureJobSeeker,
  getCandidateUser,
} from "@/lib/candidate-access";
import { readProtectedJson } from "@/lib/request-security";
import {
  buildInitialCvContent,
  DEFAULT_CV_THEME,
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

const modeValue = (value) =>
  value === "PUBLIC_SERVICE" ? "PUBLIC_SERVICE" : "GENERAL";

async function actor() {
  if (!candidateCareerEnabled()) {
    return { error: privateJson({ error: "Not found" }, { status: 404 }) };
  }
  const user = await getCandidateUser();
  return user
    ? { user }
    : { error: privateJson({ error: "Sign in required" }, { status: 401 }) };
}

async function targetJob(id) {
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

export async function GET() {
  const { user, error } = await actor();
  if (error) return error;

  if (!user.jobSeeker) return privateJson({ cvs: [] });

  const cvs = await prisma.candidateCv.findMany({
    where: { jobSeekerId: user.jobSeeker.id },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      kind: true,
      mode: true,
      targetRole: true,
      targetJobId: true,
      language: true,
      atsScore: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return privateJson({ cvs });
}

export async function POST(request) {
  const { user, error } = await actor();
  if (error) return error;

  const parsed = await readProtectedJson(request, {
    scope: "candidate-cv-create",
    limit: 30,
    maxBytes: 16_384,
    rateIdentity: user.id,
  });
  if (parsed.error) return parsed.error;

  const sourceCvId = clean(parsed.body.sourceCvId, 80);
  const targetJobId = clean(parsed.body.targetJobId, 80) || null;
  const targetRole = clean(parsed.body.targetRole, 180) || null;
  const mode = modeValue(parsed.body.mode);
  const language = parsed.body.language === "sw" ? "sw" : "en";
  const name = clean(parsed.body.name, 120) || (targetRole ? `${targetRole} CV` : "Master CV");

  const job = await targetJob(targetJobId);
  if (targetJobId && !job) {
    return privateJson({ error: "Selected vacancy is not available." }, { status: 404 });
  }

  const cv = await prisma.$transaction(async (tx) => {
    const jobSeeker = await ensureJobSeeker(tx, user);

    let content;
    let theme;
    let kind = "MASTER";

    if (sourceCvId) {
      const source = await tx.candidateCv.findFirst({
        where: { id: sourceCvId, jobSeekerId: jobSeeker.id },
        select: { content: true, theme: true },
      });
      if (!source) throw new Error("SOURCE_CV_NOT_FOUND");
      content = normalizeCvContent(source.content);
      theme = normalizeCvTheme(source.theme);
      kind = "TAILORED";
    } else {
      const profile = await tx.jobSeeker.findUnique({
        where: { id: jobSeeker.id },
        select: {
          fullName: true,
          phone: true,
          headline: true,
          location: true,
          portfolioUrl: true,
        },
      });
      content = buildInitialCvContent(profile || {}, user);
      theme = DEFAULT_CV_THEME;
    }

    const evaluation = scoreCandidateCv(content, { mode, job });

    return tx.candidateCv.create({
      data: {
        jobSeekerId: jobSeeker.id,
        name,
        kind,
        mode,
        targetRole: targetRole || job?.title || null,
        targetJobId: job?.id || null,
        language,
        content,
        theme,
        atsScore: evaluation.score,
      },
      select: {
        id: true,
        name: true,
        kind: true,
        mode: true,
        targetRole: true,
        targetJobId: true,
        language: true,
        content: true,
        theme: true,
        atsScore: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }).catch((transactionError) => {
    if (transactionError?.message === "SOURCE_CV_NOT_FOUND") return null;
    throw transactionError;
  });

  if (!cv) {
    return privateJson({ error: "Source CV not found." }, { status: 404 });
  }

  return privateJson({ cv }, { status: 201 });
}
