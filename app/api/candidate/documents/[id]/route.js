import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  candidateCareerEnabled,
  getCandidateUser,
} from "@/lib/candidate-access";
import {
  CandidateDocumentStorageError,
  deleteCandidateDocument,
  isPrivateCandidateDocumentLocator,
  readCandidateDocument,
  sanitizeCandidateDocumentName,
} from "@/lib/candidate-document-storage";
import { protectMutation } from "@/lib/request-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const privateHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
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

async function ownedDocument(user, id) {
  if (!user.jobSeeker) return null;

  return prisma.candidateDocument.findFirst({
    where: {
      id,
      jobSeekerId: user.jobSeeker.id,
    },
    select: {
      id: true,
      name: true,
      kind: true,
      url: true,
    },
  });
}

export async function GET(_request, { params }) {
  if (!candidateCareerEnabled()) {
    return privateJson({ error: "Not found" }, { status: 404 });
  }

  const user = await getCandidateUser();
  if (!user) {
    return privateJson({ error: "Sign in required" }, { status: 401 });
  }

  const { id } = await params;
  const document = await ownedDocument(user, id);
  if (!document) {
    return privateJson({ error: "Document not found" }, { status: 404 });
  }

  if (!isPrivateCandidateDocumentLocator(document.url)) {
    return privateJson(
      { error: "Legacy document links are not available through Daraja." },
      { status: 410 },
    );
  }

  let bytes;
  try {
    bytes = await readCandidateDocument(document.url);
  } catch (error) {
    if (
      error?.code === "ENOENT" ||
      error instanceof CandidateDocumentStorageError
    ) {
      return privateJson({ error: "Document not found" }, { status: 404 });
    }
    return privateJson(
      { error: "Document could not be read." },
      { status: 500 },
    );
  }

  const fileName = sanitizeCandidateDocumentName(document.name);
  return new Response(bytes, {
    status: 200,
    headers: {
      ...privateHeaders,
      "Content-Type": "application/pdf",
      "Content-Length": String(bytes.byteLength),
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}

export async function DELETE(request, { params }) {
  if (!candidateCareerEnabled()) {
    return privateJson({ error: "Not found" }, { status: 404 });
  }

  const user = await getCandidateUser();
  if (!user) {
    return privateJson({ error: "Sign in required" }, { status: 401 });
  }

  const mutationError = protectMutation(request, {
    scope: "candidate-document-delete",
    limit: 20,
    windowMs: 60_000,
  });
  if (mutationError) return mutationError;

  const { id } = await params;
  const document = await ownedDocument(user, id);
  if (!document) {
    return privateJson({ error: "Document not found" }, { status: 404 });
  }

  if (isPrivateCandidateDocumentLocator(document.url)) {
    try {
      await deleteCandidateDocument(document.url);
    } catch {
      return privateJson(
        { error: "Document could not be deleted." },
        { status: 500 },
      );
    }
  }

  const deleted = await prisma.candidateDocument.deleteMany({
    where: {
      id: document.id,
      jobSeekerId: user.jobSeeker.id,
    },
  });

  if (!deleted.count) {
    return privateJson(
      { error: "Document could not be deleted." },
      { status: 409 },
    );
  }

  return new Response(null, {
    status: 204,
    headers: privateHeaders,
  });
}
