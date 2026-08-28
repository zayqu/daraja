import { Buffer } from "node:buffer";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  candidateCareerEnabled,
  ensureJobSeeker,
  getCandidateUser,
} from "@/lib/candidate-access";
import {
  CandidateDocumentStorageError,
  MAX_CANDIDATE_DOCUMENT_BYTES,
  MAX_CANDIDATE_UPLOAD_REQUEST_BYTES,
  candidateDocumentUploadsEnabled,
  deleteCandidateDocument,
  normalizeCandidateDocumentKind,
  storeCandidatePdf,
  validateCandidatePdf,
} from "@/lib/candidate-document-storage";
import { protectMutation } from "@/lib/request-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const privateHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
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

function storageErrorResponse(error) {
  if (!(error instanceof CandidateDocumentStorageError)) {
    return privateJson(
      { error: "The document could not be stored." },
      { status: 500 },
    );
  }

  const statusByCode = {
    INVALID_FILE: 400,
    FILE_TOO_LARGE: 413,
    INVALID_FILE_TYPE: 415,
    INVALID_FILE_SIGNATURE: 415,
    MALWARE_DETECTED: 422,
    SCANNER_UNAVAILABLE: 503,
    STORAGE_UNAVAILABLE: 503,
  };

  return privateJson(
    { error: error.message },
    { status: statusByCode[error.code] || 500 },
  );
}

export async function POST(request) {
  if (!candidateCareerEnabled()) {
    return privateJson({ error: "Not found" }, { status: 404 });
  }

  if (!candidateDocumentUploadsEnabled()) {
    return privateJson(
      { error: "Private document uploads are not available yet." },
      { status: 503 },
    );
  }

  const user = await getCandidateUser();
  if (!user) {
    return privateJson({ error: "Sign in required" }, { status: 401 });
  }

  const mutationError = protectMutation(request, {
    scope: "candidate-document-upload",
    limit: 10,
    windowMs: 60_000,
  });
  if (mutationError) return mutationError;

  const mediaType = (request.headers.get("content-type") || "").toLowerCase();
  if (!mediaType.startsWith("multipart/form-data;")) {
    return privateJson(
      { error: "Document uploads must use multipart form data." },
      { status: 415 },
    );
  }

  const declaredLength = Number(request.headers.get("content-length"));
  if (!Number.isFinite(declaredLength) || declaredLength <= 0) {
    return privateJson(
      { error: "Document upload size is required." },
      { status: 411 },
    );
  }
  if (declaredLength > MAX_CANDIDATE_UPLOAD_REQUEST_BYTES) {
    return privateJson(
      { error: "Document upload is too large." },
      { status: 413 },
    );
  }

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return privateJson(
      { error: "Document upload could not be read." },
      { status: 400 },
    );
  }

  const fileEntries = formData.getAll("file");
  const kindEntries = formData.getAll("kind");
  const extraKeys = [...new Set(formData.keys())].filter(
    (key) => key !== "file" && key !== "kind",
  );

  if (
    fileEntries.length !== 1 ||
    kindEntries.length !== 1 ||
    extraKeys.length > 0
  ) {
    return privateJson(
      { error: "Upload exactly one document and one document type." },
      { status: 400 },
    );
  }

  const file = fileEntries[0];
  const kind = normalizeCandidateDocumentKind(kindEntries[0]);

  if (!kind) {
    return privateJson(
      { error: "Choose a supported document type." },
      { status: 400 },
    );
  }

  if (
    !file ||
    typeof file !== "object" ||
    typeof file.arrayBuffer !== "function" ||
    !Number.isFinite(file.size)
  ) {
    return privateJson(
      { error: "Choose a PDF document to upload." },
      { status: 400 },
    );
  }

  if (file.size > MAX_CANDIDATE_DOCUMENT_BYTES) {
    return privateJson(
      { error: "PDF documents must be 4 MB or smaller." },
      { status: 413 },
    );
  }

  let bytes;
  let displayName;
  try {
    bytes = Buffer.from(await file.arrayBuffer());
    displayName = validateCandidatePdf({
      name: file.name,
      type: file.type,
      size: file.size,
      bytes,
    });
  } catch (error) {
    return storageErrorResponse(error);
  }

  let locator;
  try {
    locator = await storeCandidatePdf(bytes);
  } catch (error) {
    return storageErrorResponse(error);
  }

  try {
    const jobSeeker = user.jobSeeker || (await ensureJobSeeker(prisma, user));
    const document = await prisma.candidateDocument.create({
      data: {
        jobSeekerId: jobSeeker.id,
        name: displayName,
        kind,
        url: locator,
      },
      select: {
        id: true,
        name: true,
        kind: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return privateJson(
      {
        document: {
          ...document,
          downloadUrl: `/api/candidate/documents/${document.id}`,
        },
      },
      { status: 201 },
    );
  } catch {
    await deleteCandidateDocument(locator).catch(() => {});
    return privateJson(
      { error: "The document could not be saved." },
      { status: 500 },
    );
  }
}
