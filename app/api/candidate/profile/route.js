import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  candidateCareerEnabled,
  getCandidateUser,
  validHttpsUrl,
} from "@/lib/candidate-access";
import { readProtectedJson } from "@/lib/request-security";

const privateHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
};

const clean = (value, max = 160) =>
  typeof value === "string"
    ? value.replace(/\s+/g, " ").trim().slice(0, max)
    : "";

const candidateProfileSelect = {
  id: true,
  fullName: true,
  phone: true,
  headline: true,
  location: true,
  experienceLevel: true,
  workArrangement: true,
  portfolioUrl: true,
  createdAt: true,
  updatedAt: true,
};

function privateJson(payload, init = {}) {
  return NextResponse.json(payload, {
    ...init,
    headers: {
      ...privateHeaders,
      ...(init.headers || {}),
    },
  });
}

export async function GET() {
  if (!candidateCareerEnabled()) {
    return privateJson({ error: "Not found" }, { status: 404 });
  }

  const user = await getCandidateUser();
  if (!user) {
    return privateJson({ error: "Sign in required" }, { status: 401 });
  }

  const profile = await prisma.jobSeeker.findUnique({
    where: { userId: user.id },
    select: {
      ...candidateProfileSelect,
      documents: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          name: true,
          kind: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  return privateJson({ profile });
}

export async function PUT(request) {
  if (!candidateCareerEnabled()) {
    return privateJson({ error: "Not found" }, { status: 404 });
  }

  const user = await getCandidateUser();
  if (!user) {
    return privateJson({ error: "Sign in required" }, { status: 401 });
  }

  const { body, error } = await readProtectedJson(request, {
    scope: "candidate-profile",
    limit: 30,
    maxBytes: 8_192,
  });
  if (error) return error;

  if (Object.prototype.hasOwnProperty.call(body, "cvUrl")) {
    return privateJson(
      {
        error:
          "CV links are no longer accepted. Candidate documents must use Daraja private storage.",
      },
      { status: 400 },
    );
  }

  const fullName = clean(body.fullName);
  if (!fullName) {
    return privateJson({ error: "Full name is required" }, { status: 400 });
  }

  const portfolioUrl = body.portfolioUrl
    ? validHttpsUrl(body.portfolioUrl)
    : null;
  if (body.portfolioUrl && !portfolioUrl) {
    return privateJson(
      { error: "Portfolio links must use HTTPS" },
      { status: 400 },
    );
  }

  const profile = await prisma.jobSeeker.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      fullName,
      phone: clean(body.phone, 40) || null,
      headline: clean(body.headline) || null,
      location: clean(body.location) || null,
      experienceLevel: clean(body.experienceLevel, 80) || null,
      workArrangement: clean(body.workArrangement, 80) || null,
      portfolioUrl,
    },
    update: {
      fullName,
      phone: clean(body.phone, 40) || null,
      headline: clean(body.headline) || null,
      location: clean(body.location) || null,
      experienceLevel: clean(body.experienceLevel, 80) || null,
      workArrangement: clean(body.workArrangement, 80) || null,
      portfolioUrl,
    },
    select: candidateProfileSelect,
  });

  return privateJson({ profile });
}
