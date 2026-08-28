import assert from "node:assert/strict";
import { chmod, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  CandidateDocumentStorageError,
  candidateDocumentScannerCandidates,
  deleteCandidateDocument,
  finalizeStagedCandidateDocumentDeletion,
  isPrivateCandidateDocumentLocator,
  readCandidateDocument,
  restoreStagedCandidateDocument,
  stageCandidateDocumentDeletion,
  storeCandidatePdf,
  validateCandidatePdf,
} from "../lib/candidate-document-storage.js";

const cleanPdf = Buffer.from(
  "%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF\n",
  "ascii",
);

function withEnv(values, fn) {
  const previous = new Map();
  for (const [key, value] of Object.entries(values)) {
    previous.set(key, process.env[key]);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }

  return Promise.resolve()
    .then(fn)
    .finally(() => {
      for (const [key, value] of previous) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    });
}

async function makeScanner(root, exitCode = 0, name = `scanner-${exitCode}.sh`) {
  const scanner = join(root, name);
  await writeFile(scanner, `#!/usr/bin/env sh\nexit ${exitCode}\n`, "utf8");
  await chmod(scanner, 0o755);
  return scanner;
}

test("candidate PDF validation checks the actual file signature", () => {
  const name = validateCandidatePdf({
    name: "Asha CV.pdf",
    type: "application/pdf",
    size: cleanPdf.length,
    bytes: cleanPdf,
  });
  assert.equal(name, "Asha CV.pdf");

  assert.throws(
    () =>
      validateCandidatePdf({
        name: "fake.pdf",
        type: "application/pdf",
        size: 8,
        bytes: Buffer.from("not-pdf!"),
      }),
    (error) =>
      error instanceof CandidateDocumentStorageError &&
      error.code === "INVALID_FILE_SIGNATURE",
  );
});

test("scanner discovery prefers an explicit override and otherwise checks cPanel first", async () => {
  await withEnv({ CLAMSCAN_PATH: "/custom/clamscan" }, async () => {
    assert.deepEqual(candidateDocumentScannerCandidates(), ["/custom/clamscan"]);
  });

  await withEnv({ CLAMSCAN_PATH: undefined }, async () => {
    assert.deepEqual(candidateDocumentScannerCandidates(), [
      "/usr/local/cpanel/3rdparty/bin/clamscan",
      "clamscan",
    ]);
  });
});

test("candidate storage can fall back from missing cPanel binary to PATH clamscan", async () => {
  const root = await mkdtemp(join(tmpdir(), "daraja-private-docs-"));
  await makeScanner(root, 0, "clamscan");

  await withEnv(
    {
      CANDIDATE_DOCUMENT_STORAGE_ROOT: join(root, "documents"),
      CANDIDATE_DOCUMENT_MALWARE_SCANNER: "clamav",
      CLAMSCAN_PATH: undefined,
      PATH: `${root}:${process.env.PATH || ""}`,
    },
    async () => {
      const locator = await storeCandidatePdf(cleanPdf);
      assert.equal(isPrivateCandidateDocumentLocator(locator), true);
      await deleteCandidateDocument(locator);
    },
  );

  await rm(root, { recursive: true, force: true });
});

test("private candidate storage uses an opaque locator and owner-only file path", async () => {
  const root = await mkdtemp(join(tmpdir(), "daraja-private-docs-"));
  const scanner = await makeScanner(root, 0);

  await withEnv(
    {
      CANDIDATE_DOCUMENT_STORAGE_ROOT: join(root, "documents"),
      CANDIDATE_DOCUMENT_MALWARE_SCANNER: "clamav",
      CLAMSCAN_PATH: scanner,
    },
    async () => {
      const locator = await storeCandidatePdf(cleanPdf);
      assert.equal(isPrivateCandidateDocumentLocator(locator), true);
      assert.doesNotMatch(locator, /https?:\/\//);

      const stored = await readCandidateDocument(locator);
      assert.deepEqual(stored, cleanPdf);

      await deleteCandidateDocument(locator);
      await assert.rejects(readCandidateDocument(locator), /ENOENT/);
    },
  );

  await rm(root, { recursive: true, force: true });
});

test("private candidate deletion can roll back before final erasure", async () => {
  const root = await mkdtemp(join(tmpdir(), "daraja-private-docs-"));
  const scanner = await makeScanner(root, 0);

  await withEnv(
    {
      CANDIDATE_DOCUMENT_STORAGE_ROOT: join(root, "documents"),
      CANDIDATE_DOCUMENT_MALWARE_SCANNER: "clamav",
      CLAMSCAN_PATH: scanner,
    },
    async () => {
      const locator = await storeCandidatePdf(cleanPdf);
      const firstStage = await stageCandidateDocumentDeletion(locator);
      await assert.rejects(readCandidateDocument(locator), /ENOENT/);

      await restoreStagedCandidateDocument(firstStage);
      assert.deepEqual(await readCandidateDocument(locator), cleanPdf);

      const finalStage = await stageCandidateDocumentDeletion(locator);
      await finalizeStagedCandidateDocumentDeletion(finalStage);
      await assert.rejects(readCandidateDocument(locator), /ENOENT/);
    },
  );

  await rm(root, { recursive: true, force: true });
});

test("candidate storage fails closed when malware scanning is unavailable", async () => {
  const root = await mkdtemp(join(tmpdir(), "daraja-private-docs-"));
  const documents = join(root, "documents");

  await withEnv(
    {
      CANDIDATE_DOCUMENT_STORAGE_ROOT: documents,
      CANDIDATE_DOCUMENT_MALWARE_SCANNER: undefined,
      CLAMSCAN_PATH: undefined,
    },
    async () => {
      await assert.rejects(
        storeCandidatePdf(cleanPdf),
        (error) =>
          error instanceof CandidateDocumentStorageError &&
          error.code === "SCANNER_UNAVAILABLE",
      );

      const files = await readdir(documents);
      assert.deepEqual(files, []);
    },
  );

  await rm(root, { recursive: true, force: true });
});

test("candidate storage rejects an infected scan result", async () => {
  const root = await mkdtemp(join(tmpdir(), "daraja-private-docs-"));
  const documents = join(root, "documents");
  const scanner = await makeScanner(root, 1);

  await withEnv(
    {
      CANDIDATE_DOCUMENT_STORAGE_ROOT: documents,
      CANDIDATE_DOCUMENT_MALWARE_SCANNER: "clamav",
      CLAMSCAN_PATH: scanner,
    },
    async () => {
      await assert.rejects(
        storeCandidatePdf(cleanPdf),
        (error) =>
          error instanceof CandidateDocumentStorageError &&
          error.code === "MALWARE_DETECTED",
      );

      const files = await readdir(documents);
      assert.deepEqual(files, []);
    },
  );

  await rm(root, { recursive: true, force: true });
});
