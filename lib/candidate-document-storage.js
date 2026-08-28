import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
  mkdir,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve, sep } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const MAX_CANDIDATE_DOCUMENT_BYTES = 4 * 1024 * 1024;
export const MAX_CANDIDATE_UPLOAD_REQUEST_BYTES =
  MAX_CANDIDATE_DOCUMENT_BYTES + 256 * 1024;

const STORAGE_PREFIX = "private-document:";
const PDF_HEADER = Buffer.from("%PDF-", "ascii");
const PDF_EOF = Buffer.from("%%EOF", "ascii");
const CPANEL_CLAMSCAN_PATH = "/usr/local/cpanel/3rdparty/bin/clamscan";
const DOCUMENT_KINDS = new Set([
  "CV",
  "COVER_LETTER",
  "CERTIFICATE",
  "PORTFOLIO",
  "OTHER",
]);

export class CandidateDocumentStorageError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "CandidateDocumentStorageError";
    this.code = code;
  }
}

export function candidateDocumentUploadsEnabled() {
  return process.env.CANDIDATE_DOCUMENT_UPLOADS_ENABLED === "true";
}

export function normalizeCandidateDocumentKind(value) {
  const kind = typeof value === "string" ? value.trim().toUpperCase() : "";
  return DOCUMENT_KINDS.has(kind) ? kind : null;
}

export function sanitizeCandidateDocumentName(value) {
  const name = typeof value === "string" ? value : "";
  const clean = name
    .replace(/[\\/]/g, "_")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[^A-Za-z0-9._ ()-]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);

  return clean || "candidate-document.pdf";
}

export function validateCandidatePdf({ name, type, size, bytes }) {
  if (!Number.isFinite(size) || size <= 0) {
    throw new CandidateDocumentStorageError(
      "INVALID_FILE",
      "Choose a non-empty PDF document.",
    );
  }

  if (size > MAX_CANDIDATE_DOCUMENT_BYTES) {
    throw new CandidateDocumentStorageError(
      "FILE_TOO_LARGE",
      "PDF documents must be 4 MB or smaller.",
    );
  }

  if (type && type.toLowerCase() !== "application/pdf") {
    throw new CandidateDocumentStorageError(
      "INVALID_FILE_TYPE",
      "Only PDF documents are accepted.",
    );
  }

  if (!Buffer.isBuffer(bytes) || bytes.length !== size) {
    throw new CandidateDocumentStorageError(
      "INVALID_FILE",
      "The uploaded document could not be validated.",
    );
  }

  if (!bytes.subarray(0, PDF_HEADER.length).equals(PDF_HEADER)) {
    throw new CandidateDocumentStorageError(
      "INVALID_FILE_SIGNATURE",
      "The uploaded file is not a valid PDF.",
    );
  }

  const trailer = bytes.subarray(Math.max(0, bytes.length - 2048));
  if (!trailer.includes(PDF_EOF)) {
    throw new CandidateDocumentStorageError(
      "INVALID_FILE_SIGNATURE",
      "The uploaded file is not a complete PDF.",
    );
  }

  return sanitizeCandidateDocumentName(name);
}

function storageRoot() {
  const configured = process.env.CANDIDATE_DOCUMENT_STORAGE_ROOT;
  const root = resolve(
    configured || join(homedir(), ".daraja", "private-documents"),
  );
  const appRoot = resolve(process.cwd());
  const publicRoot = resolve(appRoot, "public");

  if (
    root === appRoot ||
    root.startsWith(`${appRoot}${sep}`) ||
    root === publicRoot ||
    root.startsWith(`${publicRoot}${sep}`)
  ) {
    throw new CandidateDocumentStorageError(
      "STORAGE_UNAVAILABLE",
      "Private document storage is not configured safely.",
    );
  }

  return root;
}

function storageKeyFromLocator(locator) {
  if (typeof locator !== "string" || !locator.startsWith(STORAGE_PREFIX)) {
    return null;
  }

  const key = locator.slice(STORAGE_PREFIX.length);
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    key,
  )
    ? key
    : null;
}

export function isPrivateCandidateDocumentLocator(locator) {
  return Boolean(storageKeyFromLocator(locator));
}

function documentPath(locator) {
  const key = storageKeyFromLocator(locator);
  if (!key) {
    throw new CandidateDocumentStorageError(
      "INVALID_LOCATOR",
      "Candidate document storage reference is invalid.",
    );
  }
  return join(storageRoot(), `${key}.pdf`);
}

export function candidateDocumentScannerCandidates() {
  const configured = process.env.CLAMSCAN_PATH?.trim();
  if (configured) return [configured];
  return [CPANEL_CLAMSCAN_PATH, "clamscan"];
}

async function scanCandidateDocument(filePath) {
  if (process.env.CANDIDATE_DOCUMENT_MALWARE_SCANNER !== "clamav") {
    throw new CandidateDocumentStorageError(
      "SCANNER_UNAVAILABLE",
      "Document security scanning is not available.",
    );
  }

  for (const executable of candidateDocumentScannerCandidates()) {
    try {
      await execFileAsync(executable, ["--no-summary", filePath], {
        timeout: 30_000,
        maxBuffer: 64 * 1024,
        windowsHide: true,
      });
      return;
    } catch (error) {
      if (error?.code === 1) {
        throw new CandidateDocumentStorageError(
          "MALWARE_DETECTED",
          "The document failed the security scan.",
        );
      }

      if (error?.code === "ENOENT" && executable !== "clamscan") {
        continue;
      }

      throw new CandidateDocumentStorageError(
        "SCANNER_UNAVAILABLE",
        "Document security scanning is not available.",
      );
    }
  }

  throw new CandidateDocumentStorageError(
    "SCANNER_UNAVAILABLE",
    "Document security scanning is not available.",
  );
}

export async function storeCandidatePdf(bytes) {
  const root = storageRoot();
  await mkdir(root, { recursive: true, mode: 0o700 });

  const key = randomUUID();
  const locator = `${STORAGE_PREFIX}${key}`;
  const finalPath = join(root, `${key}.pdf`);
  const stagingPath = join(root, `.${key}.uploading`);

  try {
    await writeFile(stagingPath, bytes, { flag: "wx", mode: 0o600 });
    await scanCandidateDocument(stagingPath);
    await rename(stagingPath, finalPath);
    return locator;
  } catch (error) {
    await rm(stagingPath, { force: true }).catch(() => {});
    throw error;
  }
}

export async function readCandidateDocument(locator) {
  return readFile(documentPath(locator));
}

export async function deleteCandidateDocument(locator) {
  await rm(documentPath(locator), { force: true });
}

export async function stageCandidateDocumentDeletion(locator) {
  const originalPath = documentPath(locator);
  const stagedPath = `${originalPath}.deleting-${randomUUID()}`;

  try {
    await rename(originalPath, stagedPath);
    return { originalPath, stagedPath };
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw new CandidateDocumentStorageError(
      "STORAGE_UNAVAILABLE",
      "Private document deletion could not be prepared safely.",
    );
  }
}

export async function restoreStagedCandidateDocument(stage) {
  if (!stage) return;
  try {
    await rename(stage.stagedPath, stage.originalPath);
  } catch {
    throw new CandidateDocumentStorageError(
      "STORAGE_UNAVAILABLE",
      "Private document deletion could not be rolled back safely.",
    );
  }
}

export async function finalizeStagedCandidateDocumentDeletion(stage) {
  if (!stage) return;
  try {
    await rm(stage.stagedPath, { force: true });
  } catch {
    throw new CandidateDocumentStorageError(
      "STORAGE_UNAVAILABLE",
      "Private document deletion could not be finalized safely.",
    );
  }
}
